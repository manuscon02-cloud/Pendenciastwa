const cron = require('node-cron');
const { getDB } = require('../db/database');
const { sendMessage, isClientReady } = require('../bot/whatsapp');

let jobs = [];

const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';

// Converte phone do banco (ex: 16997868778) para ID WhatsApp (5516997868778@c.us)
function toWaId(phone) {
  const n = phone.replace(/\D/g, '');
  const cc = n.startsWith('55') ? n : '55' + n;
  return `${cc}@c.us`;
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

  const formatBloco = (items) => {
    let s = '';
    for (const p of items) {
      s += `◻️ *#${p.id}* ${p.title}\n`;
      s += `   👤 ${mentionTag(p.responsible_phone)}\n\n`;
    }
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
    text += formatBloco(alta);
  }

  if (media.length > 0) {
    text += `🟡 *IMPORTANTE*\n\n`;
    text += formatBloco(media);
  }

  if (baixa.length > 0) {
    text += `🟢 *PROGRAMADO*\n\n`;
    text += formatBloco(baixa);
  }

  text += `${sep}\n`;
  text += `✅ ${concluidas} concluída(s)  |  🔴 ${pendencies.length} aberta(s)\n`;
  text += `📸 Envie foto com *#feito [nº]* para registrar conclusão`;

  return { text, mentions };
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
  const { text, mentions } = buildMessage(pendencies, concluidas);

  try {
    await sendMessage(cfg.value, text, mentions);
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

  console.log(`✅ ${schedules.length} horário(s) agendado(s)`);
}

module.exports = { initScheduler, sendReminders };
