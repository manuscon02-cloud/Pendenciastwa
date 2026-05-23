/**
 * SEED – Pendências da Obra Montes Claros
 * Execute: node seed.js
 * ⚠️  Atualize os números de telefone antes de rodar!
 */

require('dotenv').config();
const { initDB, getDB } = require('./src/db/database');

// ─── EDITE OS NÚMEROS AQUI (somente dígitos, com DDD) ───────────────────────
const PHONES = {
  gaspar:       '31999990001',   // ← coloque o número do Gaspar
  vagner:       '31999990002',   // ← coloque o número do Vagner
  arnaldo:      '31999990003',   // ← coloque o número do Arnaldo
  lucas:        '31999990004',   // ← coloque o número do Lucas
  almoxarifado: '31999990005',   // ← coloque o número do responsável do almoxarifado
  compras:      '31999990006',   // ← coloque o número do responsável de compras
  nestle:       '31999990007',   // ← coordenador que trata com a Nestlé
};
// ─────────────────────────────────────────────────────────────────────────────

const DEADLINE = '2026-05-27'; // Quarta-feira

const pendencies = [
  { id:1,  title: 'Identificar quadro elétrico com carômetro',           description: 'Foto do eletricista responsável da empresa comprovando identificação',          responsible_name: 'Gaspar',       responsible_phone: PHONES.gaspar,       priority: 'alta' },
  { id:2,  title: 'Providenciar abrigo para produtos químicos',           description: 'Vagner vai fabricar o abrigo',                                                   responsible_name: 'Vagner',       responsible_phone: PHONES.vagner,       priority: 'alta' },
  { id:3,  title: 'Providenciar copos individuais e identificar',         description: 'Fazer solicitação de compras',                                                   responsible_name: 'Compras',      responsible_phone: PHONES.compras,      priority: 'media' },
  { id:4,  title: 'Fixar cilindros de gases em dois pontos (manual SHE pg.74)', description: 'Fixação obrigatória em dois pontos conforme manual SHE página 74',        responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'alta' },
  { id:5,  title: 'Providenciar trancas para escadas manuais fora de uso',description: 'Escadas que não estiverem em uso devem ser trancadas',                         responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { id:6,  title: 'Providenciar iluminação para container almoxarifado e tenda', description: 'Iluminação adequada nos dois locais',                                     responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { id:7,  title: 'Sinalizar desnível entre degrau e entrada dos containers', description: 'Sinalização de segurança obrigatória',                                      responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:8,  title: 'Adequação da altura dos lavatórios (NR18 – pias a 0,90m)', description: 'Regularizar conforme NR18 – altura 0,90m',                                 responsible_name: 'Gaspar',       responsible_phone: PHONES.gaspar,       priority: 'alta' },
  { id:9,  title: 'Conferir todos os pontos de tomadas e identificar tensão', description: 'Verificar e identificar a tensão de cada tomada',                           responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { id:10, title: 'Providenciar laudo de aterramento dos containers',     description: 'Documento técnico obrigatório',                                                  responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:11, title: 'Providenciar laudo de habitabilidade dos containers marítimos', description: 'Documento técnico obrigatório para containers marítimos',              responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:12, title: 'Providenciar PGR atualizado para atender NR18',        description: 'Atualização obrigatória do PGR conforme NR18',                                  responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:13, title: 'Providenciar e posicionar placas de rota de fuga',     description: 'Placas de emergência no canteiro de obras',                                     responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:14, title: 'Providenciar Projeto da área de vivência com ART e anexar ao PGR', description: 'Responsáveis: Arnaldo (lead) e Lucas',                              responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:15, title: 'Providenciar Projeto elétrico do canteiro com ART',    description: 'Projeto elétrico completo com Anotação de Responsabilidade Técnica',            responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:16, title: 'Providenciar local específico para guarda de EPIs novos e usados', description: 'Separação e organização de EPIs novos e usados',                    responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { id:17, title: 'Adquirir coletor para descarte de materiais não recicláveis', description: 'Coletor específico para resíduos não recicláveis',                        responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { id:18, title: 'Realizar nivelamento da área do canteiro',             description: 'Existe desnível significativo – verificando solução com a Nestlé',              responsible_name: 'Nestle/Coord', responsible_phone: PHONES.nestle,       priority: 'baixa' },
  { id:19, title: 'Fornecer e evidenciar entrega de palmilhas antiperfurantes', description: 'Para todos os colaboradores – evidência de entrega obrigatória',          responsible_name: 'Arnaldo',      responsible_phone: PHONES.arnaldo,      priority: 'alta' },
  { id:20, title: 'Realizar adequação de bancada conforme manual SHE',    description: 'Vagner iniciou a fabricação – aguardando conclusão',                            responsible_name: 'Vagner',       responsible_phone: PHONES.vagner,       priority: 'media' },
];

initDB();
const db = getDB();

const stmt = db.prepare(`
  INSERT OR IGNORE INTO pendencies
    (title, description, responsible_name, responsible_phone, deadline, priority)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (const p of items) {
    stmt.run(p.title, p.description, p.responsible_name, p.responsible_phone, DEADLINE, p.priority);
  }
});

insertMany(pendencies);

const count = db.prepare("SELECT COUNT(*) as c FROM pendencies WHERE status='pendente'").get();
console.log(`\n✅ ${count.c} pendências inseridas com prazo ${DEADLINE}\n`);
console.log('⚠️  Lembre-se de atualizar os números de telefone no arquivo seed.js ou pelo dashboard!\n');
