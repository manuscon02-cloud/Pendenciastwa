const { getDB } = require('../db/database');

const PRAZO_AUDITORIA = '28/05/2026';
const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';

function buildReport() {
  const db = getDB();
  const sep = '━'.repeat(30);
  const now = new Date();
  const tz = { timeZone: 'America/Sao_Paulo' };

  const diaSemanaRaw = now.toLocaleDateString('pt-BR', { ...tz, weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1).split('-')[0];
  const data = now.toLocaleDateString('pt-BR', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });

  const concluidas  = db.prepare("SELECT * FROM pendencies WHERE status = 'concluida'").all();
  const emValidacao = db.prepare("SELECT * FROM pendencies WHERE status = 'aguardando_validacao'").all();
  const abertas     = db.prepare("SELECT * FROM pendencies WHERE status = 'pendente'").all();
  const total = concluidas.length + emValidacao.length + abertas.length;

  // Responsáveis com abertas (agrupado)
  const abertasPorResp = {};
  abertas.forEach(p => {
    abertasPorResp[p.responsible_name] = (abertasPorResp[p.responsible_name] || 0) + 1;
  });

  // Responsáveis que concluíram (únicos)
  const respConcluiram = [...new Set(concluidas.map(p => p.responsible_name))];

  let text = HEADER;
  text += `📋 *RELATÓRIO DIÁRIO DE OBRAS*\n`;
  text += `🏭 *Nestlé Montes Claros*\n`;
  text += `🗓️ ${diaSemana}, ${data}  |  ⏰ ${hora}h\n`;
  text += `${sep}\n\n`;

  text += `✅ *Concluídas: ${concluidas.length} de ${total}*\n`;
  text += `🔴 *Em aberto: ${abertas.length} de ${total}*\n`;
  if (emValidacao.length > 0) {
    text += `⏳ *Aguardando validação: ${emValidacao.length}*\n`;
  }

  text += `\n${sep}\n\n`;

  // Quem concluiu
  if (respConcluiram.length > 0) {
    text += `✅ *Responsáveis que concluíram:*\n`;
    text += respConcluiram.join(' · ') + '\n\n';
  }

  // Quem tem abertos
  if (Object.keys(abertasPorResp).length > 0) {
    text += `🔴 *Responsáveis com pendências abertas:*\n`;
    Object.entries(abertasPorResp).forEach(([nome, qtd]) => {
      text += `• ${nome} — ${qtd} item(s)\n`;
    });
    text += '\n';
  } else {
    text += `🎉 *Todas as pendências foram resolvidas!*\n\n`;
  }

  text += `${sep}\n`;
  text += `⚠️ _Prazo final: ${PRAZO_AUDITORIA} — Auditoria Nestlé_\n`;
  text += `_⚙️ Sistema TWA de Gestão de Obras_`;

  return text;
}

module.exports = { buildReport };
