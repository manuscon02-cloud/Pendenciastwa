const cron = require('node-cron');
const { getDB } = require('../db/database');
const { sendMessage, isClientReady } = require('../bot/whatsapp');

let jobs = [];

function buildMessage(pendencies) {
  const agora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const [datePart, timePart] = agora.split(', ');
  const sep = '━'.repeat(29);

  let msg = `⚠️ *PENDÊNCIAS – OBRA NESTLÉ MONTES CLAROS*\n`;
  msg += `📅 Data: ${datePart}  🕐 ${timePart}\n`;
  msg += `${sep}\n\n`;

  pendencies.forEach(p => {
    const prioLabel = p.priority === 'alta' ? '🔴 Alta' : p.priority === 'media' ? '🟡 Média' : '🟢 Baixa';
    msg += `☐ *#${p.id}* – ${p.title}\n`;
    msg += `   👤 ${p.responsible_name}  |  ${prioLabel}\n\n`;
  });

  msg += `${sep}\n`;
  msg += `📌 *${pendencies.length} pendência(s) em aberto*\n`;
  msg += `✅ Concluir: envie foto com legenda *#feito [número]*\n`;
  msg += `   Exemplo: foto + legenda *#feito 1*`;

  return msg;
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

  try {
    await sendMessage(cfg.value, buildMessage(pendencies));
    const now = new Date().toISOString();
    const logStmt = db.prepare('INSERT INTO reminder_logs (pendency_id, sent_at) VALUES (?, ?)');
    const updateStmt = db.prepare('UPDATE pendencies SET last_reminded_at = ? WHERE id = ?');

    pendencies.forEach(p => {
      logStmt.run(p.id, now);
      updateStmt.run(now, p.id);
    });

    console.log(`📨 Cobrança enviada: ${pendencies.length} pendência(s)`);
  } catch (err) {
    console.error('❌ Erro ao enviar cobrança:', err.message);
  }
}

function initScheduler() {
  // Para os jobs antigos
  jobs.forEach(j => j.destroy());
  jobs = [];

  const db = getDB();
  const schedules = db.prepare('SELECT * FROM schedules WHERE active = 1').all();

  schedules.forEach(s => {
    const expr = `${s.minute} ${s.hour} * * 1-6`; // Segunda a Sábado
    const job = cron.schedule(expr, async () => {
      console.log(`🕐 Executando cobrança: ${s.hour}:${String(s.minute).padStart(2, '0')}`);
      await sendReminders();
    }, { timezone: 'America/Sao_Paulo' });

    jobs.push(job);
    console.log(`📅 Agendado: ${s.hour}:${String(s.minute).padStart(2, '0')} (seg-sáb)`);
  });

  console.log(`✅ ${schedules.length} horário(s) agendado(s)`);
}

module.exports = { initScheduler, sendReminders };
