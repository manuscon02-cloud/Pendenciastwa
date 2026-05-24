const { getDB } = require('../db/database');
const { add: bufferAdd } = require('./updateBuffer');

const HEADER = '🤖 *AGENTE DE OBRAS TWA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';
const rply = (m, t) => m.reply(HEADER + t);

function progressBar(pct) {
  const p = pct || 0;
  const filled = Math.round(p / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ' ' + p + '%';
}

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

function getValidatorName(db, phone) {
  const v = getValidators(db).find(v => phoneMatch(phone, v.phone));
  return v ? v.name : phone;
}

async function handleMessage(msg) {
  const db = getDB();

  if (!msg.from.includes('@g.us')) return;

  const groupCfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  if (groupCfg && msg.from !== groupCfg.value) return;

  const senderPhone = msg.author ? msg.author.replace('@c.us', '') : null;
  if (!senderPhone) return;

  const rawBody = (msg.body || '').trim();
  const body = rawBody.toLowerCase();

  const progressMatch = rawBody.match(/^(\d+)([abcdeABCDE])$/i);
  if (!progressMatch && !body.startsWith('#')) return;

  // ── Códigos de progresso (ex: 1C, 2A, 14E) ───────────────────────────────
  if (progressMatch) {
    const pendencyId = parseInt(progressMatch[1]);
    const letter = progressMatch[2].toUpperCase();
    const percentMap = { A: 0, B: 25, C: 50, D: 75, E: 100 };
    const percent = percentMap[letter];

    const pendency = db.prepare(
      "SELECT * FROM pendencies WHERE id = ? AND status = 'pendente'"
    ).get(pendencyId);

    if (!pendency) {
      const anyPend = db.prepare('SELECT * FROM pendencies WHERE id = ?').get(pendencyId);
      if (!anyPend) {
        await rply(msg, `❌ Pendência *#${pendencyId}* não encontrada.`);
      } else if (anyPend.status === 'concluida') {
        await rply(msg, `✅ Pendência *#${pendencyId}* já foi concluída.`);
      } else {
        await rply(msg, `⏳ Pendência *#${pendencyId}* já está aguardando validação.`);
      }
      return;
    }

    if (!phoneMatch(senderPhone, pendency.responsible_phone) && !isValidator(db, senderPhone)) {
      await rply(msg,
        `⛔ Você não é o responsável pela pendência *#${pendencyId}*.\n` +
        `Apenas *${pendency.responsible_name}* pode atualizar esta pendência.`
      );
      return;
    }

    const nowIso = new Date().toISOString();

    if (letter === 'E') {
      db.prepare(`
        UPDATE pendencies
        SET progress = 100, progress_updated_at = ?, status = 'aguardando_validacao'
        WHERE id = ?
      `).run(nowIso, pendencyId);

      const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';
      await rply(msg,
        `✅ *Pendência #${pendencyId} marcada como concluída!*\n\n` +
        `📌 *${pendency.title}*\n` +
        `👤 ${pendency.responsible_name}\n\n` +
        `⏳ *Aguardando validação de ${validatorNames}*`
      );
      bufferAdd({ id: pendencyId, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'aguardando_validacao' });
      console.log(`📋 Pendência #${pendencyId} → aguardando_validacao via código E — ${senderPhone}`);
    } else {
      db.prepare(`
        UPDATE pendencies SET progress = ?, progress_updated_at = ? WHERE id = ?
      `).run(percent, nowIso, pendencyId);

      const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      await rply(msg,
        `📊 Progresso atualizado!\n` +
        `*#${pendencyId}* ${pendency.title}\n` +
        `${progressBar(percent)}\n` +
        `👤 ${pendency.responsible_name} · ${hora}`
      );
      bufferAdd({ id: pendencyId, title: pendency.title, progress: percent, responsible_name: pendency.responsible_name, status: 'pendente' });
      console.log(`📊 Pendência #${pendencyId} → ${percent}% via código ${letter} — ${senderPhone}`);
    }
    return;
  }

  // ── #feito [id] ───────────────────────────────────────────────────────────
  if (body.startsWith('#feito')) {
    const id = parseInt((body.split(' ')[1] || '').trim());

    if (!id || isNaN(id)) {
      await rply(msg, '❌ Use: *#feito [número]*\nEx: *#feito 3*');
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
        await rply(msg, `⏳ A pendência *#${id}* já está aguardando validação de *${names}*.`);
      } else {
        await rply(msg, `❌ Pendência *#${id}* não encontrada ou já foi concluída.`);
      }
      return;
    }

    if (!phoneMatch(senderPhone, pendency.responsible_phone)) {
      await rply(msg, `⛔ Apenas *${pendency.responsible_name}* pode marcar esta pendência.`);
      return;
    }

    db.prepare(`
      UPDATE pendencies
      SET status = 'aguardando_validacao', progress = 100, progress_updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';
    await rply(msg,
      `✅ *Pendência #${id} marcada como concluída!*\n\n` +
      `📌 *${pendency.title}*\n` +
      `👤 ${pendency.responsible_name}\n\n` +
      `⏳ *Aguardando validação de ${validatorNames}*\n\n` +
      `✅ Para validar: *#validar ${id}*`
    );
    bufferAdd({ id, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'aguardando_validacao' });
    console.log(`📋 Pendência #${id} → aguardando_validacao via #feito — ${senderPhone}`);
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
      "SELECT * FROM pendencies WHERE id = ? AND status != 'concluida'"
    ).get(id);

    if (!pendency) {
      await rply(msg, `❌ Pendência *#${id}* não encontrada ou já foi concluída.`);
      return;
    }

    const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const validatorName = getValidatorName(db, senderPhone);

    db.prepare(`
      UPDATE pendencies
      SET status = 'concluida', progress = 100, progress_updated_at = ?, completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    await rply(msg,
      `✅ *Pendência #${id} VALIDADA E CONCLUÍDA!*\n\n` +
      `📋 *${pendency.title}*\n` +
      `👤 Responsável: ${pendency.responsible_name}\n` +
      `✅ Validado por: ${validatorName}\n` +
      `🕐 ${hora}`
    );
    bufferAdd({ id, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'concluida' });
    console.log(`✅ Pendência #${id} validada por ${validatorName} (${senderPhone})`);
    return;
  }

  // ── #rejeitar [id] [motivo] — só validadores ──────────────────────────────
  if (body.startsWith('#rejeitar')) {
    const parts = body.split(' ');
    const id = parseInt((parts[1] || '').trim());
    const motivo = parts.slice(2).join(' ').trim();

    if (!id || isNaN(id)) {
      await rply(msg, '❌ Use: *#rejeitar [número] [motivo]*\nEx: *#rejeitar 3 serviço incompleto*');
      return;
    }

    if (!isValidator(db, senderPhone)) {
      const names = getValidatorNames(db) || 'Antônio ou Ronaldo';
      await rply(msg, `⛔ Apenas *${names}* podem rejeitar pendências.`);
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
      SET status = 'pendente', progress = 0, progress_updated_at = NULL
      WHERE id = ?
    `).run(id);

    const motivoTexto = motivo ? `\n\n📝 *Motivo:* ${motivo}` : '';
    await rply(msg,
      `❌ *Pendência #${id} REJEITADA*\n\n` +
      `📋 *${pendency.title}*\n` +
      `👤 *${pendency.responsible_name}*, execute o serviço e marque novamente.${motivoTexto}\n\n` +
      `✍️ Use *#feito ${id}* ou o código *${id}E* quando concluir`
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
      `📋 *COMANDOS DO BOT DE PENDÊNCIAS*\n\n` +
      `*Para todos os responsáveis:*\n` +
      `✅ *#feito [número]* → marcar como concluído\n` +
      `📊 *[número][letra]* → atualizar progresso\n` +
      `   A=0% · B=25% · C=50% · D=75% · E=Concluído\n` +
      `   Exemplo: *1C* = item 1 em 50%\n` +
      `📊 *#status* → ver todas as pendências abertas\n\n` +
      `*Somente ${validatorNames}:*\n` +
      `✅ *#validar [número]* → aprovar e concluir\n` +
      `❌ *#rejeitar [número] [motivo]* → devolver pendência\n\n` +
      `❓ *#ajuda* → esta mensagem`
    );
  }
}

module.exports = { handleMessage };
