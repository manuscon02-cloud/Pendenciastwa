const cron = require('node-cron');
const { getDB } = require('../db/database');
const { sendMessage, isClientReady } = require('../bot/whatsapp');

let jobs = [];

const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';

function toWaId(phone) {
  const n = phone.replace(/\D/g, '');
  const cc = n.startsWith('55') ? n : '55' + n;
  return `${cc}@c.us`;
}

function progressBar(pct) {
  const p = pct || 0;
  const filled = Math.round(p / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ' ' + p + '%';
}

function buildMessage(pendencies, concluidas) {
  const now = new Date();
  const tz = { timeZone: 'America/Sao_Paulo' };

  const diaSemanaRaw = now.toLocaleDateString('pt-BR', { ...tz, weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1).split('-')[0];
  const data = now.toLocaleDateString('pt-BR', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });

  const sep = '━'.repeat(25);
  const mentions = [];

  const mentionTag = (phone) => {
    const id = toWaId(phone);
    if (!mentions.includes(id)) mentions.push(id);
    return `@${id.replace('@c.us', '')}`;
  };

  const formatItem = (p) => {
    const pct = p.progress || 0;
    const warned = pct === 0 && p.last_reminded_at;
    const prefix = warned ? '⚠️ ' : '';
    let s = `${prefix}◻️ *#${p.id}* ${p.title}\n`;
    s += `   👤 ${mentionTag(p.responsible_phone)}\n`;
    s += `   ${progressBar(pct)}\n\n`;
    return s;
  };

  const alta  = pendencies.filter(p => p.priority === 'alta');
  const media = pendencies.filter(p => p.priority === 'media');
  const baixa = pendencies.filter(p => p.priority === 'baixa');

  let text = HEADER;
  text += `🏗️ *CHECKLIST – NESTLÉ MONTES CLAROS*\n`;
  text += `🗓️ ${diaSemana} ${data}  |  ⏰ ${hora}\n`;
  text += `${sep}\n\n`;

  if (alta.length > 0) {
    text += `🔴 *CRÍTICO – resolver hoje*\n\n`;
    alta.forEach(p => { text += formatItem(p); });
  }

  if (media.length > 0) {
    text += `🟡 *IMPORTANTE*\n\n`;
    media.forEach(p => { text += formatItem(p); });
  }

  if (baixa.length > 0) {
    text += `🟢 *PROGRAMADO*\n\n`;
    baixa.forEach(p => { text += formatItem(p); });
  }

  // Monta menu de códigos agrupado por responsável
  text += `${sep}\n`;
  text += `📊 *COMO ATUALIZAR SEU PROGRESSO:*\n\n`;

  const byResponsible = {};
  for (const p of pendencies) {
    const key = `${p.responsible_name}|${p.responsible_phone}`;
    if (!byResponsible[key]) {
      byResponsible[key] = { name: p.responsible_name, phone: p.responsible_phone, ids: [] };
    }
    byResponsible[key].ids.push(p.id);
  }

  for (const resp of Object.values(byResponsible)) {
    const codes = resp.ids.map(id => `*${id}A* *${id}B* *${id}C* *${id}D* *${id}E*`).join(' ');
    text += `👤 ${mentionTag(resp.phone)} → ${codes}\n`;
  }

  text += `\n📌 *Legenda:*\n`;
  text += `*A=0% · B=25% · C=50% · D=75% · E=100%*\n\n`;
  text += `*Exemplo:* responda *1C* para marcar #1 em 50%\n\n`;

  text += `${sep}\n`;
  text += `✅ ${concluidas} concluída(s)  |  🔴 ${pendencies.length} aberta(s)\n`;
  text += `_⚙️ Mensagem automática · Sistema TWA de Gestão de Obras_`;

  return { text, mentions };
}

function buildReport(db) {
  const sep = '━'.repeat(25);
  const now = new Date();
  const tz = { timeZone: 'America/Sao_Paulo' };
  const data = now.toLocaleDateString('pt-BR', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });

  const concluidas  = db.prepare("SELECT * FROM pendencies WHERE status = 'concluida' ORDER BY completed_at DESC").all();
  const emValidacao = db.prepare("SELECT * FROM pendencies WHERE status = 'aguardando_validacao'").all();
  const abertas     = db.prepare(`
    SELECT * FROM pendencies WHERE status = 'pendente'
    ORDER BY CASE priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, deadline ASC
  `).all();

  let text = HEADER;
  text += `📋 *RELATÓRIO DO DIA — ${data}  |  ⏰ ${hora}*\n${sep}\n\n`;

  if (concluidas.length > 0) {
    text += `✅ *CONCLUÍDAS (${concluidas.length}):*\n\n`;
    concluidas.forEach(p => {
      text += `✅ *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}\n\n`;
    });
    text += `${sep}\n\n`;
  } else {
    text += `✅ *CONCLUÍDAS: nenhuma ainda*\n\n${sep}\n\n`;
  }

  if (emValidacao.length > 0) {
    text += `⏳ *AGUARDANDO VALIDAÇÃO (${emValidacao.length}):*\n\n`;
    emValidacao.forEach(p => {
      text += `⏳ *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}\n\n`;
    });
    text += `${sep}\n\n`;
  }

  if (abertas.length > 0) {
    text += `🔴 *ABERTAS (${abertas.length}):*\n\n`;
    abertas.forEach(p => {
      const emoji = p.priority === 'alta' ? '🔴' : p.priority === 'media' ? '🟡' : '🟢';
      text += `${emoji} *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}  ${progressBar(p.progress || 0)}\n\n`;
    });
    text += `${sep}\n\n`;
  }

  const total = concluidas.length + emValidacao.length + abertas.length;
  text += `📊 *Total: ${total}* | ✅ ${concluidas.length} concluída(s) | ⏳ ${emValidacao.length} em validação | 🔴 ${abertas.length} aberta(s)\n`;
  text += `_⚙️ Relatório automático · Sistema TWA de Gestão de Obras_`;

  return text;
}

async function sendDailyReport() {
  if (!isClientReady()) {
    console.log('⚠️ WhatsApp offline. Relatório pulado.');
    return;
  }

  const db = getDB();
  const cfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  if (!cfg) {
    console.log('⚠️ Nenhum grupo configurado. Relatório cancelado.');
    return;
  }

  try {
    await sendMessage(cfg.value, buildReport(db), []);
    console.log('📊 Relatório diário enviado.');
  } catch (err) {
    console.error('❌ Erro ao enviar relatório:', err.message);
  }
}

async function sendReminders() {
  if (!isClientReady()) {
    console.log('⚠️ WhatsApp offline. Cobrança pulada.');
    return;
  }

  const db = getDB();
  const cfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();

  if (!cfg) {
    console.log('⚠️ Nenhum grupo configurado. Configure no dashboard.');
    return;
  }

  const pendencies = db.prepare(`
    SELECT * FROM pendencies WHERE status = 'pendente'
    ORDER BY CASE priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, deadline ASC
  `).all();

  const emValidacao = db.prepare(
    "SELECT * FROM pendencies WHERE status = 'aguardando_validacao'"
  ).all();

  if (pendencies.length === 0 && emValidacao.length === 0) {
    console.log('✅ Sem pendências. Cobrança cancelada.');
    return;
  }

  if (pendencies.length === 0) {
    console.log('✅ Só há itens em validação. Cobrança de pendentes cancelada.');
    return;
  }

  const concluidas = db.prepare("SELECT COUNT(*) as c FROM pendencies WHERE status = 'concluida'").get().c;
  const result = buildMessage(pendencies, concluidas);
  const msgText  = result.text;
  const mentions = result.mentions;

  console.log(`🔍 Mensagem: ${msgText.length} chars, ${mentions.length} menções`);

  try {
    await sendMessage(cfg.value, msgText, mentions);
    const now = new Date().toISOString();
    const logStmt    = db.prepare('INSERT INTO reminder_logs (pendency_id, sent_at) VALUES (?, ?)');
    const updateStmt = db.prepare('UPDATE pendencies SET last_reminded_at = ? WHERE id = ?');

    pendencies.forEach(p => {
      logStmt.run(p.id, now);
      updateStmt.run(now, p.id);
    });

    console.log(`📨 Cobrança enviada: ${pendencies.length} pendência(s), ${mentions.length} @menção(ões)`);
  } catch (err) {
    console.error('❌ Erro ao enviar cobrança:', err.message);
  }
}

function initScheduler() {
  jobs.forEach(j => j.stop());
  jobs = [];

  const db = getDB();
  const schedules = db.prepare('SELECT * FROM schedules WHERE active = 1').all();

  schedules.forEach(s => {
    const expr = `${s.minute} ${s.hour} * * *`;
    const job = cron.schedule(expr, async () => {
      console.log(`🕐 Executando cobrança: ${s.hour}:${String(s.minute).padStart(2, '0')}`);
      await sendReminders();
    }, { timezone: 'America/Sao_Paulo' });

    jobs.push(job);
    console.log(`📅 Agendado: ${s.hour}:${String(s.minute).padStart(2, '0')} (todos os dias)`);
  });

  // Relatório diário fixo às 17:30
  const reportJob = cron.schedule('30 17 * * *', async () => {
    console.log('📊 Enviando relatório diário 17:30...');
    await sendDailyReport();
  }, { timezone: 'America/Sao_Paulo' });
  jobs.push(reportJob);

  console.log(`✅ ${schedules.length} horário(s) de cobrança + relatório diário 17:30`);
}

module.exports = { initScheduler, sendReminders, sendDailyReport };
