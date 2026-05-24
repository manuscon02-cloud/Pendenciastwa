/**
 * fix-encoding.js — corrige descrições corrompidas via API Railway.
 * Execute: node fix-encoding.js
 */

const BASE = process.env.API_URL || 'https://pendenciastwa-production.up.railway.app';

const fixes = [
  { id: 3,  description: 'Fazer solicitação de compras' },
  { id: 4,  description: 'Fixação obrigatória em dois pontos conforme manual SHE página 74' },
  { id: 5,  description: 'Escadas que não estiverem em uso devem ser trancadas' },
  { id: 6,  description: 'Iluminação adequada nos dois locais' },
  { id: 7,  description: 'Sinalização de segurança obrigatória' },
  { id: 9,  description: 'Verificar e identificar a tensão de cada tomada' },
  { id: 10, description: 'Documento técnico obrigatório' },
  { id: 11, description: 'Documento técnico obrigatório para containers marítimos' },
  { id: 12, description: 'Atualização obrigatória do PGR conforme NR18' },
  { id: 13, description: 'Placas de emergência no canteiro de obras' },
  { id: 14, description: 'Responsáveis: Arnaldo (lead) e Lucas' },
  { id: 15, description: 'Projeto elétrico completo com Anotação de Responsabilidade Técnica' },
  { id: 16, description: 'Separação e organização de EPIs novos e usados' },
  { id: 17, description: 'Coletor específico para resíduos não recicláveis' },
  { id: 18, description: 'Existe desnível significativo – verificando solução com a Nestlé' },
  { id: 19, description: 'Para todos os colaboradores – evidência de entrega obrigatória' },
  { id: 20, description: 'Vagner iniciou a fabricação – aguardando conclusão' },
];

async function run() {
  console.log(`\n🔧 Corrigindo encoding em ${BASE}...\n`);

  const res = await fetch(`${BASE}/api/pendencies`);
  const current = await res.json();

  let fixed = 0, skipped = 0;

  for (const fix of fixes) {
    const curr = current.find(p => p.id === fix.id);
    if (!curr) { console.log(`  ⚠️  #${fix.id} não encontrada no banco`); continue; }

    if (curr.description === fix.description) {
      console.log(`  ✓  #${fix.id} — sem correção necessária`);
      skipped++;
      continue;
    }

    console.log(`  🔴 #${fix.id} corrompida: "${curr.description}"`);
    console.log(`       → "${fix.description}"`);

    const r = await fetch(`${BASE}/api/pendencies/${fix.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: fix.description }),
    });

    if (r.ok) { fixed++; console.log(`       ✅ corrigida`); }
    else { console.log(`       ❌ Erro HTTP ${r.status}`); }
  }

  console.log(`\n✅ Concluído: ${fixed} corrigida(s), ${skipped} já OK.\n`);
}

run().catch(console.error);
