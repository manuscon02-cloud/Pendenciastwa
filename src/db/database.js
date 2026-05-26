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

  const rows = [
    ['Identificar quadro elétrico com carômetro',                        'Foto do eletricista responsável da empresa comprovando identificação',               'Gaspar',       PHONES.gaspar,       'alta'],
    ['Providenciar abrigo para produtos químicos',                        'Vagner vai fabricar o abrigo',                                                       'Vagner',       PHONES.vagner,       'alta'],
    ['Providenciar copos individuais e identificar',                      'Fazer solicitação de compras',                                                        'Compras',      PHONES.compras,      'media'],
    ['Fixar cilindros de gases em dois pontos (manual SHE pg.74)',        'Fixação obrigatória em dois pontos conforme manual SHE página 74',                   'Almoxarifado', PHONES.almoxarifado, 'alta'],
    ['Providenciar trancas para escadas manuais fora de uso',             'Escadas que não estiverem em uso devem ser trancadas',                               'Almoxarifado', PHONES.almoxarifado, 'media'],
    ['Providenciar iluminação para container almoxarifado e tenda',       'Iluminação adequada nos dois locais',                                                 'Almoxarifado', PHONES.almoxarifado, 'media'],
    ['Sinalizar desnível entre degrau e entrada dos containers',          'Sinalização de segurança obrigatória',                                                'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Adequação da altura dos lavatórios (NR18 – pias a 0,90m)',          'Regularizar conforme NR18 – altura 0,90m',                                           'Gaspar',       PHONES.gaspar,       'alta'],
    ['Conferir todos os pontos de tomadas e identificar tensão',          'Verificar e identificar a tensão de cada tomada',                                    'Almoxarifado', PHONES.almoxarifado, 'media'],
    ['Providenciar laudo de aterramento dos containers',                  'Documento técnico obrigatório',                                                       'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar laudo de habitabilidade dos containers marítimos',     'Documento técnico obrigatório para containers marítimos',                             'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar PGR atualizado para atender NR18',                     'Atualização obrigatória do PGR conforme NR18',                                        'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar e posicionar placas de rota de fuga',                  'Placas de emergência no canteiro de obras',                                           'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar Projeto da área de vivência com ART e anexar ao PGR', 'Responsáveis: Arnaldo (lead) e Lucas',                                                'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar Projeto elétrico do canteiro com ART',                 'Projeto elétrico completo com Anotação de Responsabilidade Técnica',                  'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Providenciar local específico para guarda de EPIs novos e usados',  'Separação e organização de EPIs novos e usados',                                      'Almoxarifado', PHONES.almoxarifado, 'media'],
    ['Adquirir coletor para descarte de materiais não recicláveis',       'Coletor específico para resíduos não recicláveis',                                    'Almoxarifado', PHONES.almoxarifado, 'media'],
    ['Realizar nivelamento da área do canteiro',                          'Existe desnível significativo – verificando solução com a Nestlé',                   'Nestle/Coord', PHONES.nestle,       'baixa'],
    ['Fornecer e evidenciar entrega de palmilhas antiperfurantes',        'Para todos os colaboradores – evidência de entrega obrigatória',                      'Arnaldo',      PHONES.arnaldo,      'alta'],
    ['Realizar adequação de bancada conforme manual SHE',                 'Vagner iniciou a fabricação – aguardando conclusão',                                  'Vagner',       PHONES.vagner,       'media'],
  ];

  const stmt = db.prepare(
    'INSERT INTO pendencies (title, description, responsible_name, responsible_phone, deadline, priority) VALUES (?, ?, ?, ?, ?, ?)'
  );
  db.transaction(list => {
    for (const [title, desc, name, phone, priority] of list)
      stmt.run(title, desc, name, phone, DL, priority);
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

  try {
    seedPendencies(db);
  } catch (err) {
    console.error('❌ Erro no auto-seed:', err.message);
  }

  console.log('✅ Banco de dados inicializado');
  return db;
}

module.exports = { initDB, getDB };
