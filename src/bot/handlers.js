const { getDB } = require('../db/database');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';
const rply = (m, t) => m.reply(HEADER + t);

function phoneMatch(a, b) {
  const clean = (n) => n.replace(/\D/g, '');
  const ca = clean(a), cb = clean(b);
  return ca.endsWith(cb.slice(-8)) || cb.endsWith(ca.slice(-8));
}

function getValidators(db) {
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'validators'").get();
  if (!row) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

function isValidator(db, phone) {
  return getValidators(db).some(v => phoneMatch(phone, v.phone));
}

function getValidatorNames(db) {
  return getValidators(db).map(v => v.name).join(' ou ');
}

async function handleMessage(msg) {
  const db = getDB();

  if (!msg.from.includes('@g.us')) return;

  const groupCfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  if (groupCfg && msg.from !== groupCfg.value) return;

  const senderPhone = msg.author ? msg.author.replace('@c.us', '') : null;
  if (!senderPhone) return;

  const body = (msg.body || '').trim().toLowerCase();

  if (!body.startsWith('#')) return;

  // ── #feito [id] + foto ────────────────────────────────────────────────────
  if (body.startsWith('#feito')) {
    const id = parseInt((body.split(' ')[1] || '').trim());

    if (!id || isNaN(id)) {
      await rply(msg, '❌ Use: *#feito [número]* com uma foto em anexo.\nEx: *#feito 3*');
      return;
    }

    const pendency = db.prepare(
      "SELECT * FROM pendencies WHERE id = ? AND status = 'pendente'"
    ).get(id);

    if (!pendency) {
      const inReview = db.prepare(
        "SELECT * FROM pendencies WHERE id = ? AND status = 'aguardando_validacao'"
      ).get(id);
      if (inReview) {
        const names = getValidatorNames(db) || 'os validadores';
        await rply(msg, `⏳ A pendência *#${id}* já está com comprovante enviado e aguardando validação de *${names}*.`);
      } else {
        await rply(msg, `❌ Pendência *#${id}* não encontrada ou já foi concluída.`);
      }
      return;
    }

    if (!phoneMatch(senderPhone, pendency.responsible_phone)) {
      await rply(msg, `⛔ Apenas *${pendency.responsible_name}* pode enviar comprovante desta pendência.`);
      return;
    }

    if (!msg.hasMedia) {
      await rply(msg,
        `📸 *${pendency.responsible_name}*, envie uma *foto* como comprovante junto com o comando.\n\n` +
        `✍️ Envie a foto com a legenda: *#feito ${id}*`
      );
      return;
    }

    let proofPath = null;
    try {
      const media = await msg.downloadMedia();
      if (media) {
        const ext = media.mimetype.split('/')[1].split(';')[0] || 'jpg';
        const filename = `proof_${id}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(media.data, 'base64'));
        proofPath = `/uploads/${filename}`;
      }
    } catch (err) {
      console.error('Erro ao salvar comprovante:', err.message);
    }

    db.prepare(`
      UPDATE pendencies
      SET status = 'aguardando_validacao', proof_path = ?
      WHERE id = ?
    `).run(proofPath, id);

    const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';

    await rply(msg,
      `📋 *Comprovante recebido para pendência #${id}!*\n\n` +
      `📌 *${pendency.title}*\n` +
      `👤 Enviado por: ${pendency.responsible_name}\n\n` +
      `⏳ *Aguardando validação de ${validatorNames}*\n\n` +
      `✅ Para validar: *#validar ${id}*\n` +
      `❌ Para rejeitar: *#rejeitar ${id} [motivo]*`
    );

    console.log(`📋 Pendência #${id} aguardando validação — comprovante de ${senderPhone}`);
    return;
  }

  // ── #validar [id] — só validadores ───────────────────────────────────────
  if (body.startsWith('#validar')) {
    const id = parseInt((body.split(' ')[1] || '').trim());

    if (!id || isNaN(id)) {
      await rply(msg, '❌ Use: *#validar [número]*\nEx: *#validar 3*');
      return;
    }

    if (!isValidator(db, senderPhone)) {
      const names = getValidatorNames(db) || 'Antônio ou Ronaldo';
      await rply(msg, `⛔ Apenas *${names}* podem validar pendências.`);
      return;
    }

    const pendency = db.prepare(
      "SELECT * FROM pendencies WHERE id = ? AND status = 'aguardando_validacao'"
    ).get(id);

    if (!pendency) {
      await rply(msg, `❌ Pendência *#${id}* não está aguardando validação.`);
      return;
    }

    const horario = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    db.prepare(`
      UPDATE pendencies
      SET status = 'concluida', completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(id);

    await rply(msg,
      `✅ *Pendência #${id} VALIDADA E CONCLUÍDA!*\n\n` +
      `📋 *${pendency.title}*\n` +
      `👤 Responsável: ${pendency.responsible_name}\n` +
      `🕐 ${horario}\n\n` +
      `👍 Validado com sucesso!`
    );

    console.log(`✅ Pendência #${id} validada por ${senderPhone}`);
    return;
  }

  // ── #rejeitar [id] [motivo] — só validadores ──────────────────────────────
  if (body.startsWith('#rejeitar')) {
    const parts = body.split(' ');
    const id = parseInt((parts[1] || '').trim());
    const motivo = parts.slice(2).join(' ').trim();

    if (!id || isNaN(id)) {
      await rply(msg, '❌ Use: *#rejeitar [número] [motivo]*\nEx: *#rejeitar 3 foto ilegível*');
      return;
    }

    if (!isValidator(db, senderPhone)) {
      const names = getValidatorNames(db) || 'Antônio ou Ronaldo';
      await rply(msg, `⛔ Apenas *${names}* podem rejeitar comprovantes.`);
      return;
    }

    const pendency = db.prepare(
      "SELECT * FROM pendencies WHERE id = ? AND status = 'aguardando_validacao'"
    ).get(id);

    if (!pendency) {
      await rply(msg, `❌ Pendência *#${id}* não está aguardando validação.`);
      return;
    }

    db.prepare(`
      UPDATE pendencies
      SET status = 'pendente', proof_path = NULL
      WHERE id = ?
    `).run(id);

    const motivoTexto = motivo ? `\n\n📝 *Motivo:* ${motivo}` : '';

    await rply(msg,
      `❌ *Comprovante da pendência #${id} REJEITADO*\n\n` +
      `📋 *${pendency.title}*\n` +
      `👤 *${pendency.responsible_name}*, envie um novo comprovante.${motivoTexto}\n\n` +
      `✍️ Envie a foto com a legenda: *#feito ${id}*`
    );

    console.log(`❌ Pendência #${id} rejeitada por ${senderPhone}. Motivo: ${motivo}`);
    return;
  }

  // ── #status ───────────────────────────────────────────────────────────────
  if (body === '#status') {
    const pendentes   = db.prepare("SELECT * FROM pendencies WHERE status = 'pendente' ORDER BY deadline ASC").all();
    const emValidacao = db.prepare("SELECT * FROM pendencies WHERE status = 'aguardando_validacao'").all();

    if (pendentes.length === 0 && emValidacao.length === 0) {
      await rply(msg, '🎉 *Todas as pendências foram concluídas!*');
      return;
    }

    let text = `📊 *STATUS DAS PENDÊNCIAS*\n${'─'.repeat(30)}\n`;

    if (emValidacao.length > 0) {
      text += `\n🟠 *AGUARDANDO VALIDAÇÃO (${emValidacao.length}):*\n`;
      emValidacao.forEach(p => {
        text += `  • *#${p.id}* ${p.title} — ${p.responsible_name}\n`;
      });
    }

    if (pendentes.length > 0) {
      text += `\n🔴 *PENDENTES (${pendentes.length}):*\n`;
      pendentes.forEach(p => {
        const emoji = p.priority === 'alta' ? '🔴' : p.priority === 'media' ? '🟡' : '🟢';
        const dl = new Date(p.deadline).toLocaleDateString('pt-BR');
        text += `\n${emoji} *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}  📅 ${dl}\n`;
      });
    }

    await rply(msg, text);
    return;
  }

  // ── #ajuda ────────────────────────────────────────────────────────────────
  if (body === '#ajuda') {
    const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';
    await rply(msg,
      `🤖 *COMANDOS DO BOT DE PENDÊNCIAS*\n\n` +
      `*Para todos os responsáveis:*\n` +
      `📸 *#feito [número]* + foto → envia comprovante\n` +
      `📊 *#status* → lista pendências abertas\n\n` +
      `*Somente ${validatorNames}:*\n` +
      `✅ *#validar [número]* → aprova e conclui\n` +
      `❌ *#rejeitar [número] [motivo]* → devolve pendência\n\n` +
      `❓ *#ajuda* → esta mensagem`
    );
  }
}

module.exports = { handleMessage };
