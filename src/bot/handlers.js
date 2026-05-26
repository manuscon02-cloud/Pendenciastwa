const { getDB } = require('../db/database');
const { add: bufferAdd } = require('./updateBuffer');
const { buildReport } = require('./reportBuilder');

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
  return ca.endsWith(cb.slice(-10)) || cb.endsWith(ca.slice(-10));
}

function getValidators(db) {
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'validators'").get();
  if (!row) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

function isValidator(db, sender) {
  return getValidators(db).some(v =>
    phoneMatch(sender, v.phone) || (v.lid && sender === v.lid)
  );
}

function getValidatorNames(db) {
  return getValidators(db).map(v => v.name).join(' ou ');
}

function getValidatorName(db, sender) {
  const v = getValidators(db).find(v => phoneMatch(sender, v.phone) || (v.lid && sender === v.lid));
  return v ? v.name : sender;
}

function getLidMap(db) {
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'lid_phone_map'").get();
  try { return JSON.parse(row?.value || '{}'); } catch { return {}; }
}

function resolveSender(sender, db) {
  const map = getLidMap(db);
  return map[sender] || sender;
}

async function handleMessage(msg) {
  try {
    return await _handleMessage(msg);
  } catch (err) {
    console.error('❌ Erro no handleMessage:', err.message, err.stack);
  }
}

async function _handleMessage(msg) {
  const db = getDB();

  if (!msg.from.includes('@g.us')) return;

  const groupCfg = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  if (groupCfg && msg.from !== groupCfg.value) return;

  const senderRaw = msg.author || '';
  const senderPhone = senderRaw.replace(/@c\.us$/, '').replace(/@lid$/, '');
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
    const nowIso = new Date().toISOString();

    // 1º — Validador: autonomia total e irrestrita
    if (isValidator(db, senderPhone)) {
      const pendency = db.prepare(
        "SELECT * FROM pendencies WHERE id = ? AND status != 'concluida'"
      ).get(pendencyId);

      if (!pendency) {
        const any = db.prepare('SELECT * FROM pendencies WHERE id = ?').get(pendencyId);
        await rply(msg, any
          ? `✅ Pendência *#${pendencyId}* já foi concluída.`
          : `❌ Pendência *#${pendencyId}* não encontrada.`
        );
        return;
      }

      const validatorName = getValidatorName(db, senderPhone);

      if (letter === 'E') {
        db.prepare(`
          UPDATE pendencies
          SET status = 'concluida', progress = 100, progress_updated_at = ?,
              completed_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(nowIso, pendencyId);

        const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        await rply(msg,
          `✅ *Pendência #${pendencyId} CONCLUÍDA!*\n\n` +
          `📋 *${pendency.title}*\n` +
          `👤 ${pendency.responsible_name}\n` +
          `✅ Encerrado por: ${validatorName}\n` +
          `🕐 ${hora}`
        );
        bufferAdd({ id: pendencyId, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'concluida' });
        console.log(`✅ Pendência #${pendencyId} encerrada por ${validatorName}`);
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
        bufferAdd({ id: pendencyId, title: pendency.title, progress: percent, responsible_name: pendency.responsible_name, status: pendency.status });
        console.log(`📊 Pendência #${pendencyId} → ${percent}% via ${letter} por ${validatorName}`);
      }
      return;
    }

    // 2º — Responsável: apenas pendências em status 'pendente'
    const pendency = db.prepare(
      "SELECT * FROM pendencies WHERE id = ? AND status = 'pendente'"
    ).get(pendencyId);

    if (!pendency) {
      const any = db.prepare('SELECT * FROM pendencies WHERE id = ?').get(pendencyId);
      if (!any) {
        await rply(msg, `❌ Pendência *#${pendencyId}* não encontrada.`);
      } else if (any.status === 'concluida') {
        await rply(msg, `✅ Pendência *#${pendencyId}* já foi concluída.`);
      } else {
        await rply(msg, `⏳ Pendência *#${pendencyId}* já está aguardando validação.`);
      }
      return;
    }

    // 3º — Não é responsável e não é validador: bloqueado
    const effectivePhone = resolveSender(senderPhone, db);
    if (!phoneMatch(effectivePhone, pendency.responsible_phone)) {
      await rply(msg,
        `⛔ Você não é o responsável pela pendência *#${pendencyId}*.\n` +
        `Apenas *${pendency.responsible_name}* pode atualizar esta pendência.`
      );
      return;
    }

    if (letter === 'E') {
      db.prepare(`
        UPDATE pendencies
        SET progress = 100, progress_updated_at = ?, status = 'aguardando_validacao'
        WHERE id = ?
      `).run(nowIso, pendencyId);

      const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';
      await rply(msg,
        `${progressBar(100)}\n` +
        `*#${pendencyId}* ${pendency.title}\n` +
        `👤 ${pendency.responsible_name} marcou como concluído\n` +
        `⏳ Aguardando confirmação de ${validatorNames}\n` +
        `Digite *${pendencyId}E* para encerrar.`
      );
      bufferAdd({ id: pendencyId, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'aguardando_validacao' });
      console.log(`📋 Pendência #${pendencyId} → aguardando_validacao via E — ${senderPhone}`);
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
      console.log(`📊 Pendência #${pendencyId} → ${percent}% via ${letter} — ${senderPhone}`);
    }
    return;
  }

  // ── #feito [id] — equivalente ao código E para o responsável ─────────────
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

    const effectivePhone = resolveSender(senderPhone, db);
    if (!phoneMatch(effectivePhone, pendency.responsible_phone)) {
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
      `${progressBar(100)}\n` +
      `*#${id}* ${pendency.title}\n` +
      `👤 ${pendency.responsible_name} marcou como concluído\n` +
      `⏳ Aguardando confirmação de ${validatorNames}\n` +
      `Digite *${id}E* para encerrar.`
    );
    bufferAdd({ id, title: pendency.title, progress: 100, responsible_name: pendency.responsible_name, status: 'aguardando_validacao' });
    console.log(`📋 Pendência #${id} → aguardando_validacao via #feito — ${senderPhone}`);
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
      text += `\n🟠 *AGUARDANDO CONFIRMAÇÃO (${emValidacao.length}):*\n`;
      emValidacao.forEach(p => {
        text += `  • *#${p.id}* ${p.title} — ${p.responsible_name}\n`;
      });
    }

    if (pendentes.length > 0) {
      text += `\n🔴 *PENDENTES (${pendentes.length}):*\n`;
      pendentes.forEach(p => {
        const emoji = p.priority === 'alta' ? '🔴' : p.priority === 'media' ? '🟡' : '🟢';
        const dl = new Date(p.deadline).toLocaleDateString('pt-BR');
        const bar = progressBar(p.progress || 0);
        text += `\n${emoji} *#${p.id}* ${p.title}\n   👤 ${p.responsible_name}  📅 ${dl}\n   ${bar}\n`;
      });
    }

    await rply(msg, text);
    return;
  }

  // ── #relatorio ────────────────────────────────────────────────────────────
  if (body === '#relatorio' || body === '#relatório') {
    await rply(msg, buildReport());
    return;
  }

  // ── #meuid ───────────────────────────────────────────────────────────────
  if (body === '#meuid') {
    await rply(msg, `Seu ID: *${senderPhone}*`);
    return;
  }

  // ── #ajuda ────────────────────────────────────────────────────────────────
  if (body === '#ajuda') {
    const validatorNames = getValidatorNames(db) || 'Antônio ou Ronaldo';
    await rply(msg,
      `📋 *COMANDOS DO BOT DE PENDÊNCIAS*\n\n` +
      `*Para todos os responsáveis:*\n` +
      `📊 *[número][letra]* → atualizar progresso\n` +
      `   A=0% · B=25% · C=50% · D=75% · E=100%\n` +
      `   Exemplo: *1C* = item 1 em 50%\n` +
      `✅ *#feito [número]* → marcar item como concluído\n` +
      `📊 *#status* → ver todas as pendências abertas\n` +
      `📋 *#relatorio* → relatório do dia (concluídas + abertas)\n\n` +
      `*Somente ${validatorNames}:*\n` +
      `✅ *[número]E* → encerrar pendência imediatamente\n\n` +
      `❓ *#ajuda* → esta mensagem`
    );
  }
}

module.exports = { handleMessage };
