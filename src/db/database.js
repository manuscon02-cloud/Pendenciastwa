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

function seedPendencies(db) {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM pendencies').get();
  if (c > 0) { console.log(`📋 Banco: ${c} pendência(s) já existentes`); return; }

  console.log('🌱 Banco vazio — populando automaticamente...');

  const PHONES = {
    gaspar:       '16997868778',
    vagner:       '16991836993',
    arnaldo:      '16988188987',
    almoxarifado: '16993207815',
    compras:      '3492677671',
    nestle:       '16988188987',
  };
  const DL = '2026-05-28';

  // Apenas as pendências ativas — com status e progresso já definidos
  const rows = [
    // [title, desc, name, phone, priority, status, progress]
    ['Sinalizar desnível entre degrau e entrada dos containers',          'Sinalização de segurança obrigatória',                                'Arnaldo', PHONES.arnaldo, 'alta',  'pendente',  0  ],
    ['Providenciar laudo de aterramento dos containers',                  'Documento técnico obrigatório',                                       'Arnaldo', PHONES.arnaldo, 'alta',  'pendente',  75 ],
    ['Providenciar PGR atualizado para atender NR18',                     'Atualização obrigatória do PGR conforme NR18',                        'Arnaldo', PHONES.arnaldo, 'alta',  'pendente',  75 ],
    ['Providenciar e posicionar placas de rota de fuga',                  'Placas de emergência no canteiro de obras',                           'Arnaldo', PHONES.arnaldo, 'alta',  'pendente',  0  ],
    ['Providenciar Projeto da área de vivência com ART e anexar ao PGR', 'Responsáveis: Arnaldo (lead) e Lucas',                                'Arnaldo', PHONES.arnaldo, 'alta',  'concluida', 100],
    ['Providenciar Projeto elétrico do canteiro com ART',                 'Projeto elétrico completo com Anotação de Responsabilidade Técnica',  'Arnaldo', PHONES.arnaldo, 'alta',  'pendente',  50 ],
    ['Realizar nivelamento da área do canteiro',                          'Existe desnível significativo – verificando solução com a Nestlé',   'Nestle/Coord', PHONES.nestle, 'baixa', 'pendente', 0],
  ];

  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO pendencies (title, description, responsible_name, responsible_phone, deadline, priority, status, progress, progress_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(list => {
    for (const [title, desc, name, phone, priority, status, progress] of list)
      stmt.run(title, desc, name, phone, DL, priority, status, progress, progress > 0 ? now : null);
  })(rows);

  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('validators', ?)").run(
    JSON.stringify([
      { name: 'Antônio', phone: '16999688354' },
      { name: 'Ronaldo', phone: '16981735919' },
    ])
  );

  console.log('✅ 20 pendências + validadores inseridos');
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
      completed_at TEXT DEFAULT NULL,
      progress     INTEGER DEFAULT 0,
      progress_updated_at TEXT DEFAULT NULL
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

    CREATE TABLE IF NOT EXISTS ata_config (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      sheets_enabled    INTEGER DEFAULT 0,
      spreadsheet_id    TEXT DEFAULT NULL,
      ata_group_id      TEXT DEFAULT NULL,
      ata_group_name    TEXT DEFAULT NULL,
      last_sync         TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS reminder_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pendency_id INTEGER,
      sent_at     TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pendency_id) REFERENCES pendencies(id)
    );
  `);

  try { db.exec('ALTER TABLE pendencies ADD COLUMN progress INTEGER DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE pendencies ADD COLUMN progress_updated_at TEXT DEFAULT NULL'); } catch (_) {}

  const schedCount = db.prepare('SELECT COUNT(*) as c FROM schedules').get();
  if (schedCount.c === 0) {
    const ins = db.prepare('INSERT INTO schedules (hour, minute) VALUES (?, ?)');
    ins.run(8, 0); ins.run(13, 0); ins.run(17, 0);
    console.log('📅 Horários padrão inseridos: 08:00, 13:00, 17:00');
  }

  const ataCount = db.prepare('SELECT COUNT(*) as c FROM ata_config').get();
  if (ataCount.c === 0) {
    db.prepare('INSERT INTO ata_config (id, sheets_enabled, spreadsheet_id) VALUES (1, 0, ?)').run(
      process.env.GOOGLE_SHEET_ID || ''
    );
    console.log('📊 Configuração de ata inicializada');
  }

  try {
    seedPendencies(db);
  } catch (err) {
    console.error('❌ Erro no auto-seed:', err.message);
  }

  console.log('✅ Banco de dados inicializado');
  return db;
}

module.exports = { initDB, getDB };
