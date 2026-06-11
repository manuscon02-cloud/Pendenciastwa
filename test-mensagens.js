// Script para testar as mensagens do bot SEM enviar no WhatsApp
require('dotenv').config();

const analyzer = require('./src/sheets/analyzer');
const reportBuilder = require('./src/sheets/reportBuilder');

async function testarMensagens() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE DAS MENSAGENS DO BOT DE ATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('📊 Conectando na planilha...\n');
    const analysis = await analyzer.analyze();

    console.log('📈 ANÁLISE DOS DADOS:\n');
    console.log('SC:');
    console.log(`  • Total pendentes (Encerrado? vazio): ${analysis.sc.total}`);
    console.log(`  • Urgentes: ${analysis.sc.urgentes}`);
    console.log(`  • Aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}`);
    console.log(`  • Sem PC: ${analysis.sc.aprovadasSemPC}`);
    console.log(`  • Mais antigas (>10 dias): ${analysis.sc.maisAntigas}`);

    console.log('\nGESTÃO COMPARTILHADA:');
    console.log(`  • Atrasadas: ${analysis.gestao.atrasadas}`);
    console.log(`  • Vencem hoje: ${analysis.gestao.venceHoje}`);
    console.log(`  • Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}`);
    console.log(`  • Concluídas hoje: ${analysis.gestao.concluidasHoje}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📅 MENSAGEM 1: PÓS-REUNIÃO (08h30)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const msg1 = reportBuilder.buildPosReuniao(analysis);
    console.log(msg1);

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⏰ MENSAGEM 2: ALERTA 14H');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const msg2 = reportBuilder.buildAlertaIntermediario(analysis);
    if (msg2) {
      console.log(msg2);
    } else {
      console.log('ℹ️  Sem alertas críticos no momento (mensagem não seria enviada)');
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📌 MENSAGEM 3: RESUMO DO DIA (18h)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const msg3 = reportBuilder.buildResumoFimDia(analysis);
    console.log(msg3);

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('\nStack:', error.stack);
  }
}

testarMensagens();
