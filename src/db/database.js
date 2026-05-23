const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/pendencias.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS pendencies (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      description  TEXT DEFAULT '',
      responsible_name  TEXT NOT NULL,
      responsible_phone TEXT NOT NULL,
      deadline     TEXT NOT NULL,
      priority     TEXT DEFAULT 'media',
      status       TEXT DEFAULT 'pendente',
      proof_path   TEXT DEFAULT NULL,
      last_reminded_at TEXT DEFAULT NULL,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      hour   INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bot_config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS reminder_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pendency_id INTEGER,
      sent_at     TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pendency_id) REFERENCES pendencies(id)
    );
  `);

  // Horários padrão se não existirem
  const count = db.prepare('SELECT COUNT(*) as c FROM schedules').get();
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO schedules (hour, minute) VALUES (?, ?)');
    insert.run(8, 0);
    insert.run(13, 0);
    insert.run(17, 0);
    console.log('📅 Horários padrão inseridos: 08:00, 13:00, 17:00');
  }

  console.log('✅ Banco de dados inicializado');
  return db;
}

module.exports = { initDB, getDB };
