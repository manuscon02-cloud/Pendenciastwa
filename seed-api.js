/**
 * Popula as pendências via API REST (não precisa de acesso direto ao banco)
 * Uso: node seed-api.js
 */
const BASE = 'https://pendenciastwa-production.up.railway.app/api';
const DL = '2026-05-28';

const PHONES = {
  gaspar:       '16997868778',
  vagner:       '16991836993',
  arnaldo:      '16988188987',
  lucas:        '16991009457',
  almoxarifado: '16993207815',
  compras:      '3492677671',
  nestle:       '16988188987',
};

const pendencies = [
  { title: 'Identificar quadro elétrico com carômetro', description: 'Foto do eletricista responsável da empresa comprovando identificação', responsible_name: 'Gaspar', responsible_phone: PHONES.gaspar, priority: 'alta' },
  { title: 'Providenciar abrigo para produtos químicos', description: 'Vagner vai fabricar o abrigo', responsible_name: 'Vagner', responsible_phone: PHONES.vagner, priority: 'alta' },
  { title: 'Providenciar copos individuais e identificar', description: 'Fazer solicitação de compras', responsible_name: 'Compras', responsible_phone: PHONES.compras, priority: 'media' },
  { title: 'Fixar cilindros de gases em dois pontos (manual SHE pg.74)', description: 'Fixação obrigatória em dois pontos conforme manual SHE página 74', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'alta' },
  { title: 'Providenciar trancas para escadas manuais fora de uso', description: 'Escadas que não estiverem em uso devem ser trancadas', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { title: 'Providenciar iluminação para container almoxarifado e tenda', description: 'Iluminação adequada nos dois locais', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { title: 'Sinalizar desnível entre degrau e entrada dos containers', description: 'Sinalização de segurança obrigatória', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Adequação da altura dos lavatórios (NR18 – pias a 0,90m)', description: 'Regularizar conforme NR18 – altura 0,90m', responsible_name: 'Gaspar', responsible_phone: PHONES.gaspar, priority: 'alta' },
  { title: 'Conferir todos os pontos de tomadas e identificar tensão', description: 'Verificar e identificar a tensão de cada tomada', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { title: 'Providenciar laudo de aterramento dos containers', description: 'Documento técnico obrigatório', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar laudo de habitabilidade dos containers marítimos', description: 'Documento técnico obrigatório para containers marítimos', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar PGR atualizado para atender NR18', description: 'Atualização obrigatória do PGR conforme NR18', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar e posicionar placas de rota de fuga', description: 'Placas de emergência no canteiro de obras', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar Projeto da área de vivência com ART e anexar ao PGR', description: 'Responsáveis: Arnaldo (lead) e Lucas', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar Projeto elétrico do canteiro com ART', description: 'Projeto elétrico completo com Anotação de Responsabilidade Técnica', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Providenciar local específico para guarda de EPIs novos e usados', description: 'Separação e organização de EPIs novos e usados', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { title: 'Adquirir coletor para descarte de materiais não recicláveis', description: 'Coletor específico para resíduos não recicláveis', responsible_name: 'Almoxarifado', responsible_phone: PHONES.almoxarifado, priority: 'media' },
  { title: 'Realizar nivelamento da área do canteiro', description: 'Existe desnível significativo – verificando solução com a Nestlé', responsible_name: 'Nestle/Coord', responsible_phone: PHONES.nestle, priority: 'baixa' },
  { title: 'Fornecer e evidenciar entrega de palmilhas antiperfurantes', description: 'Para todos os colaboradores – evidência de entrega obrigatória', responsible_name: 'Arnaldo', responsible_phone: PHONES.arnaldo, priority: 'alta' },
  { title: 'Realizar adequação de bancada conforme manual SHE', description: 'Vagner iniciou a fabricação – aguardando conclusão', responsible_name: 'Vagner', responsible_phone: PHONES.vagner, priority: 'media' },
];

const validators = [
  { name: 'Antônio', phone: '16993101683' },
  { name: 'Ronaldo', phone: '16981735919' },
];

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function main() {
  // Verifica quantas já existem e insere só as que faltam
  const existing = await (await fetch(`${BASE}/pendencies`)).json();
  const existingTitles = new Set(existing.map(p => p.title));
  const missing = pendencies.filter(p => !existingTitles.has(p.title));

  if (missing.length === 0) {
    console.log(`✅ Todas as ${pendencies.length} pendências já estão no banco.`);
  } else {
    console.log(`📥 Inserindo ${missing.length} pendência(s) faltando...`);
    for (const p of missing) {
      const r = await post(`${BASE}/pendencies`, { ...p, deadline: DL });
      console.log(`  ✅ #${r.id} ${r.title.slice(0, 50)}`);
    }
  }

  // Validadores
  console.log('\n📥 Configurando validadores...');
  for (const v of validators) {
    await post(`${BASE}/validators`, v);
    console.log(`  ✅ ${v.name} (${v.phone})`);
  }

  const status = await (await fetch(`${BASE}/status`)).json();
  console.log(`\n✅ Concluído! Stats: ${JSON.stringify(status.stats)}`);
}

main().catch(console.error);
