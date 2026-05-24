const { sendMessage, isClientReady } = require('./whatsapp');
const { getDB } = require('../db/database');

const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';
const DEBOUNCE_MS = 5 * 60 * 1000;

let buffer = [];
let timer = null;

function progressBar(pct) {
  const p = pct || 0;
  const filled = Math.round(p / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

async function flush() {
  timer = null;
  if (buffer.length === 0) return;

  const items = [...buffer].sort((a, b) => a.id - b.id);
  buffer = [];

  if (!isClientReady()) {
    console.log('⚠️ Resumo coletivo: WhatsApp offline, descartando buffer.');
    return;
  }

  const db = getDB();
  const cfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  if (!cfg) return;

  const concluidas = db.prepare("SELECT COUNT(*) as c FROM pendencies WHERE status = 'concluida'").get().c;
  const abertas    = db.prepare("SELECT COUNT(*) as c FROM pendencies WHERE status = 'pendente'").get().c;

  const sep = '━'.repeat(25);

  let text = HEADER;
  text += `📊 *ATUALIZAÇÕES RECENTES*\n${sep}\n\n`;

  for (const item of items) {
    const bar = progressBar(item.progress);
    text += `*#${item.id}* ${item.title}\n`;
    text += `   ${bar} ${item.progress}% · ${item.responsible_name}`;
    if (item.status === 'aguardando_validacao') {
      text += ` ⏳ aguard. validação`;
    } else if (item.status === 'concluida') {
      text += ` ✅ VALIDADO`;
    }
    text += '\n\n';
  }

  text += `${sep}\n`;
  text += `✅ ${concluidas} concluída(s)  |  🔴 ${abertas} aberta(s)\n`;
  text += `_⚙️ Mensagem automática · Sistema TWA de Gestão de Obras_`;

  try {
    await sendMessage(cfg.value, text, []);
    console.log(`📊 Resumo coletivo enviado: ${items.length} atualização(ões)`);
  } catch (err) {
    console.error('❌ Erro ao enviar resumo coletivo:', err.message);
  }
}

function add(pendency) {
  const entry = {
    id:               pendency.id,
    title:            pendency.title,
    progress:         pendency.progress,
    responsible_name: pendency.responsible_name,
    status:           pendency.status,
  };

  const idx = buffer.findIndex(b => b.id === entry.id);
  if (idx >= 0) {
    buffer[idx] = entry;
  } else {
    buffer.push(entry);
  }

  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
  console.log(`📝 Buffer: ${buffer.length} item(ns), resumo em 5min`);
}

module.exports = { add };
