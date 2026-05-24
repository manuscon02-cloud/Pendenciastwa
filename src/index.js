require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB, getDB } = require('./db/database');
const { initWhatsApp } = require('./bot/whatsapp');
const { handleMessage } = require('./bot/handlers');
const { initScheduler } = require('./scheduler/cron');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(
  process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads')
));
app.use('/api', routes);

app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../public/index.html'))
);

// ── Seed automático se banco estiver vazio ───────────────────────────────────
function autoSeed(db) {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM pendencies').get();
  if (c > 0) { console.log(`📋 Banco já tem ${c} pendência(s) — seed ignorado`); return; }

  console.log('🌱 Banco vazio — populando automaticamente...');

  const PHONES = {
    gaspar:       '16997868778',
    vagner:       '16991836993',
    arnaldo:      '16988188987',
    lucas:        '16991009457',
    almoxarifado: '16993207815',
    compras:      '3492677671',
    nestle:       '16988188987',
  };
  const DL = '2026-05-28';

  const pendencies = [
    { title: 'Identificar quadro elétrico com carômetro',                          description: 'Foto do eletricista responsável da empresa comprovando identificação',                    responsible_name: 'Gaspar',       responsible_phone: PHONES.gaspar,       priority: 'alta' },
    { title: 'Providenciar abrigo para produtos químicos',                          description: 'Vagner vai fabricar o abrigo',                                                             responsible_name: 'Vagner',       responsible_phone: PHONES.vagner,       priority: 'alta' },
    { title: 'Providenciar copos individuais e identificar',                        description: 'Fazer solicitação de compras',                                                              responsible_name: 'Compras',      responsible_phone: PHONES.compras,      priority: 'media' },
    { title: 'Fixar cilindros de gases em dois pontos (manual SHE pg.74)',          description: 'Fixação obrigatória em dois pontos conforme manual SHE página 74',                        responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'alta' },
    { title: 'Providenciar trancas para escadas manuais fora de uso',               description: 'Escadas que não estiverem em uso devem ser trancadas',                                    responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
    { title: 'Providenciar iluminação para container almoxarifado e tenda',         description: 'Iluminação adequada nos dois locais',                                                      responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
    { title: 'Sinalizar desnível entre degrau e entrada dos containers',            description: 'Sinalização de segurança obrigatória',                                                     responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Adequação da altura dos lavatórios (NR18 – pias a 0,90m)',            description: 'Regularizar conforme NR18 – altura 0,90m',                                                responsible_name: 'Gaspar',       responsible_phone: PHONES.gaspar,       priority: 'alta' },
    { title: 'Conferir todos os pontos de tomadas e identificar tensão',            description: 'Verificar e identificar a tensão de cada tomada',                                         responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
    { title: 'Providenciar laudo de aterramento dos containers',                    description: 'Documento técnico obrigatório',                                                            responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar laudo de habitabilidade dos containers marítimos',       description: 'Documento técnico obrigatório para containers marítimos',                                  responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar PGR atualizado para atender NR18',                       description: 'Atualização obrigatória do PGR conforme NR18',                                            responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar e posicionar placas de rota de fuga',                    description: 'Placas de emergência no canteiro de obras',                                               responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar Projeto da área de vivência com ART e anexar ao PGR',   description: 'Responsáveis: Arnaldo (lead) e Lucas',                                                    responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar Projeto elétrico do canteiro com ART',                   description: 'Projeto elétrico completo com Anotação de Responsabilidade Técnica',                     responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Providenciar local específico para guarda de EPIs novos e usados',    description: 'Separação e organização de EPIs novos e usados',                                          responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
    { title: 'Adquirir coletor para descarte de materiais não recicláveis',         description: 'Coletor específico para resíduos não recicláveis',                                        responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
    { title: 'Realizar nivelamento da área do canteiro',                            description: 'Existe desnível significativo – verificando solução com a Nestlé',                       responsible_name: 'Nestle/Coord', responsible_phone: PHONES.nestle,       priority: 'baixa' },
    { title: 'Fornecer e evidenciar entrega de palmilhas antiperfurantes',          description: 'Para todos os colaboradores – evidência de entrega obrigatória',                          responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
    { title: 'Realizar adequação de bancada conforme manual SHE',                   description: 'Vagner iniciou a fabricação – aguardando conclusão',                                      responsible_name: 'Vagner',       responsible_phone: PHONES.vagner,       priority: 'media' },
  ];

  const stmt = db.prepare(`
    INSERT INTO pendencies (title, description, responsible_name, responsible_phone, deadline, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.transaction(items => {
    for (const p of items) stmt.run(p.title, p.description, p.responsible_name, p.responsible_phone, DL, p.priority);
  })(pendencies);

  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('validators', ?)").run(
    JSON.stringify([
      { name: 'Antônio', phone: '16999688354' },
      { name: 'Ronaldo', phone: '16981735919' },
    ])
  );

  console.log('✅ 20 pendências + validadores inseridos automaticamente');
}

// ── Aplica GROUP_ID do env var (persiste mesmo após reset do banco) ───────────
function applyEnvConfig(db) {
  const groupId   = process.env.GROUP_ID;
  const groupName = process.env.GROUP_NAME || groupId;
  if (!groupId) return;

  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_id', ?)").run(groupId);
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_name', ?)").run(groupName);
  console.log(`✅ Grupo aplicado via env: ${groupName}`);
}

async function start() {
  console.log('🚀 Iniciando sistema de pendências...\n');

  initDB();
  const db = getDB();
  autoSeed(db);
  applyEnvConfig(db);

  console.log('📱 Inicializando WhatsApp (aguarde o QR code)...');
  initWhatsApp(handleMessage).catch(err =>
    console.error('❌ Erro WhatsApp:', err.message)
  );

  initScheduler();

  app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando na porta ${PORT}`);
    console.log(`📊 Dashboard:  http://localhost:${PORT}`);
    console.log(`📱 QR Code:    http://localhost:${PORT}/api/qr\n`);
  });
}

start().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
