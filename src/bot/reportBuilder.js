const { getDB } = require('../db/database');

const PRAZO_AUDITORIA = '28/05/2026';
const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';

function progressBar(pct) {
  const p = pct || 0;
  const filled = Math.round(p / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${p}%`;
}

function buildReport() {
  const db = getDB();
  const sep = '━'.repeat(30);
  const now = new Date();
  const tz = { timeZone: 'America/Sao_Paulo' };

  const diaSemanaRaw = now.toLocaleDateString('pt-BR', { ...tz, weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1).split('-')[0];
  const data = now.toLocaleDateString('pt-BR', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });

  const concluidas  = db.prepare("SELECT * FROM pendencies WHERE status = 'concluida' ORDER BY id ASC").all();
  const emValidacao = db.prepare("SELECT * FROM pendencies WHERE status = 'aguardando_validacao'").all();
  const abertas     = db.prepare(`
    SELECT * FROM pendencies WHERE status = 'pendente'
    ORDER BY CASE priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, id ASC
  `).all();

  const total = concluidas.length + emValidacao.length + abertas.length;

  let text = HEADER;
  text += `📋 *RELATÓRIO DIÁRIO DE OBRAS*\n`;
  text += `🏭 *Nestlé Montes Claros*\n`;
  text += `🗓️ ${diaSemana}, ${data}  |  ⏰ ${hora}h\n`;
  text += `${sep}\n\n`;

  // ── Concluídas ────────────────────────────────────────────────────────────
  text += `✅ *PENDÊNCIAS CONCLUÍDAS — ${concluidas.length} de ${total}*\n\n`;
  if (concluidas.length > 0) {
    concluidas.forEach(p => {
      text += `✅ *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}\n`;
    });
  } else {
    text += `_Nenhuma pendência concluída ainda._\n`;
  }
  text += `\n${sep}\n\n`;

  // ── Aguardando validação ──────────────────────────────────────────────────
  if (emValidacao.length > 0) {
    text += `⏳ *AGUARDANDO VALIDAÇÃO — ${emValidacao.length}*\n\n`;
    emValidacao.forEach(p => {
      text += `⏳ *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}\n`;
    });
    text += `\n${sep}\n\n`;
  }

  // ── Abertas ───────────────────────────────────────────────────────────────
  const totalAbertas = abertas.length + emValidacao.length;
  text += `🔴 *PENDÊNCIAS EM ABERTO — ${totalAbertas} de ${total}*\n`;
  text += `⚠️ _Prazo limite: ${PRAZO_AUDITORIA} — Auditoria Nestlé_\n\n`;

  if (abertas.length > 0) {
    abertas.forEach(p => {
      const emoji = p.priority === 'alta' ? '🔴' : p.priority === 'media' ? '🟡' : '🟢';
      text += `${emoji} *#${p.id}* ${p.title}\n`;
      text += `   👤 ${p.responsible_name}  ${progressBar(p.progress || 0)}\n`;
    });
  } else {
    text += `_Todas as pendências foram resolvidas!_ 🎉\n`;
  }

  text += `\n${sep}\n\n`;

  // ── Resumo ────────────────────────────────────────────────────────────────
  text += `📊 *RESUMO GERAL*\n`;
  text += `┌ Total de pendências: *${total}*\n`;
  text += `├ ✅ Concluídas: *${concluidas.length}*\n`;
  if (emValidacao.length > 0) {
    text += `├ ⏳ Aguardando validação: *${emValidacao.length}*\n`;
  }
  text += `└ 🔴 Em aberto: *${abertas.length}*\n\n`;
  text += `_⚙️ Sistema TWA de Gestão de Obras · Relatório automático_`;

  return text;
}

module.exports = { buildReport };
