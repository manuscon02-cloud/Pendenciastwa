const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { getGroups, getQRCode, isClientReady } = require('../bot/whatsapp');
const { initScheduler, sendReminders, sendDailyReport } = require('../scheduler/cron');

// ── STATUS ──────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const db = getDB();
  const groupCfg  = db.prepare("SELECT value FROM bot_config WHERE key = 'group_id'").get();
  const groupName = db.prepare("SELECT value FROM bot_config WHERE key = 'group_name'").get();
  const stats = db.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pendente')              AS pendente,
      COUNT(*) FILTER (WHERE status = 'aguardando_validacao')  AS aguardando,
      COUNT(*) FILTER (WHERE status = 'concluida')             AS concluida
    FROM pendencies
  `).get();

  res.json({
    whatsapp: isClientReady(),
    qrAvailable: !!getQRCode(),
    group_id:   groupCfg  ? groupCfg.value  : null,
    group_name: groupName ? groupName.value : null,
    stats
  });
});

// ── QR CODE ─────────────────────────────────────────────────────────────────
router.get('/qr', (req, res) => {
  const qr = getQRCode();
  if (!qr) {
    return res.json({
      connected: isClientReady(),
      qr: null,
      message: isClientReady() ? 'WhatsApp conectado!' : 'Aguardando QR code...'
    });
  }
  res.json({ connected: false, qr });
});

// ── VALIDADORES ──────────────────────────────────────────────────────────────
router.get('/validators', (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'validators'").get();
  try { res.json(JSON.parse(row?.value || '[]')); }
  catch { res.json([]); }
});

router.post('/validators', (req, res) => {
  const { name, phone, lid } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name e phone obrigatórios' });
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'validators'").get();
  let list = [];
  try { list = JSON.parse(row?.value || '[]'); } catch {}
  const entry = { name, phone: phone.replace(/\D/g, '') };
  if (lid) entry.lid = lid.replace(/\D/g, '');
  list.push(entry);
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('validators', ?)").run(JSON.stringify(list));
  res.json(list);
});

router.delete('/validators/:phone', (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'validators'").get();
  let list = [];
  try { list = JSON.parse(row?.value || '[]'); } catch {}
  list = list.filter(v => !v.phone.endsWith(req.params.phone.slice(-8)));
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('validators', ?)").run(JSON.stringify(list));
  res.json(list);
});

// ── MAPA LID→TELEFONE ────────────────────────────────────────────────────────
router.get('/lid-map', (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'lid_phone_map'").get();
  try { res.json(JSON.parse(row?.value || '{}')); } catch { res.json({}); }
});

router.post('/lid-map', (req, res) => {
  const { lid, phone } = req.body;
  if (!lid || !phone) return res.status(400).json({ error: 'lid e phone obrigatórios' });
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'lid_phone_map'").get();
  let map = {};
  try { map = JSON.parse(row?.value || '{}'); } catch {}
  map[lid.replace(/\D/g, '')] = phone.replace(/\D/g, '');
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('lid_phone_map', ?)").run(JSON.stringify(map));
  res.json(map);
});

router.delete('/lid-map/:lid', (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM bot_config WHERE key = 'lid_phone_map'").get();
  let map = {};
  try { map = JSON.parse(row?.value || '{}'); } catch {}
  delete map[req.params.lid];
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('lid_phone_map', ?)").run(JSON.stringify(map));
  res.json(map);
});

// ── GRUPOS ───────────────────────────────────────────────────────────────────
router.get('/groups', async (req, res) => {
  try {
    const groups = await getGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/groups/select', (req, res) => {
  const { groupId, groupName } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId obrigatório' });
  const db = getDB();
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_id', ?)").run(groupId);
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_name', ?)").run(groupName || groupId);
  res.json({ success: true });
});

// ── PENDÊNCIAS ───────────────────────────────────────────────────────────────
router.get('/pendencies', (req, res) => {
  const db = getDB();
  const { status } = req.query;
  let sql = 'SELECT * FROM pendencies';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += " ORDER BY CASE priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, deadline ASC";
  res.json(db.prepare(sql).all(...params));
});

router.post('/pendencies', (req, res) => {
  const { title, description, responsible_name, responsible_phone, deadline, priority } = req.body;
  if (!title || !responsible_name || !responsible_phone || !deadline) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, responsible_name, responsible_phone, deadline' });
  }
  const db = getDB();
  const r = db.prepare(`
    INSERT INTO pendencies (title, description, responsible_name, responsible_phone, deadline, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || '', responsible_name, responsible_phone, deadline, priority || 'media');
  res.status(201).json(db.prepare('SELECT * FROM pendencies WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/pendencies/:id', (req, res) => {
  const db = getDB();
  const { title, description, responsible_name, responsible_phone, deadline, priority, status, progress } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE pendencies SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      responsible_name = COALESCE(?, responsible_name),
      responsible_phone = COALESCE(?, responsible_phone),
      deadline = COALESCE(?, deadline),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      progress = COALESCE(?, progress),
      progress_updated_at = CASE WHEN ? IS NOT NULL THEN ? ELSE progress_updated_at END,
      completed_at = CASE WHEN ? = 'concluida' AND completed_at IS NULL THEN datetime('now','localtime') ELSE completed_at END
    WHERE id = ?
  `).run(title, description, responsible_name, responsible_phone, deadline, priority, status, progress, progress, now, status, req.params.id);
  res.json(db.prepare('SELECT * FROM pendencies WHERE id = ?').get(req.params.id));
});

router.delete('/pendencies/:id', (req, res) => {
  getDB().prepare('DELETE FROM pendencies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── AGENDAMENTOS ─────────────────────────────────────────────────────────────
router.get('/schedules', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM schedules ORDER BY hour, minute').all());
});

router.post('/schedules', (req, res) => {
  const { hour, minute } = req.body;
  if (hour === undefined || minute === undefined) {
    return res.status(400).json({ error: 'hour e minute obrigatórios' });
  }
  const db = getDB();
  const r = db.prepare('INSERT INTO schedules (hour, minute) VALUES (?, ?)').run(hour, minute);
  initScheduler();
  res.status(201).json(db.prepare('SELECT * FROM schedules WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/schedules/:id', (req, res) => {
  getDB().prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  initScheduler();
  res.json({ success: true });
});

// ── DISPARO MANUAL ────────────────────────────────────────────────────────────
router.post('/trigger', async (req, res) => {
  try {
    await sendReminders();
    res.json({ success: true, message: 'Cobrança enviada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trigger-report', async (req, res) => {
  try {
    await sendDailyReport();
    res.json({ success: true, message: 'Relatório enviado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGS ──────────────────────────────────────────────────────────────────────
router.get('/logs', (req, res) => {
  const logs = getDB().prepare(`
    SELECT rl.*, p.title, p.responsible_name
    FROM reminder_logs rl
    LEFT JOIN pendencies p ON p.id = rl.pendency_id
    ORDER BY rl.sent_at DESC LIMIT 100
  `).all();
  res.json(logs);
});

module.exports = router;
