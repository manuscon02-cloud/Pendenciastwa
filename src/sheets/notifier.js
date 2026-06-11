const cron = require('node-cron');
const analyzer = require('./analyzer');
const reportBuilder = require('./reportBuilder');
const { sendLongMessage } = require('../bot/whatsapp');

class AtaNotifier {
  constructor(whatsappClient) {
    this.client = whatsappClient;
    this.jobs = [];
  }

  init(getGroupId) {
    this.getGroupId = getGroupId;

    // 08h30 - Pós-reunião
    this.jobs.push(
      cron.schedule('30 8 * * 1-5', () => this.sendPosReuniao(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    // 15h30 - Alerta intermediário
    this.jobs.push(
      cron.schedule('30 15 * * 1-5', () => this.sendAlertaIntermediario(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    // 18h - Resumo do dia
    this.jobs.push(
      cron.schedule('0 18 * * 1-5', () => this.sendResumoFimDia(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    console.log('✅ Notificador de ata inicializado');
    console.log('   📅 08h30: Relatório pós-reunião (Segunda a Sexta)');
    console.log('   ⏰ 15h30: Checkpoint intermediário (Segunda a Sexta)');
    console.log('   📊 18h00: Resumo do dia (Segunda a Sexta)');
  }

  async sendPosReuniao() {
    try {
      const groupId = this.getGroupId();
      if (!groupId) {
        console.log('⚠️  Grupo não configurado. Pulando notificação pós-reunião.');
        return;
      }

      console.log('📊 Gerando relatório pós-reunião...');
      const analysis = await analyzer.analyze();
      const message = reportBuilder.buildPosReuniao(analysis);

      await sendLongMessage(groupId, message);
      console.log('✅ Relatório pós-reunião enviado');
    } catch (error) {
      console.error('❌ Erro ao enviar relatório pós-reunião:', error.message);
    }
  }

  async sendAlertaIntermediario() {
    try {
      const groupId = this.getGroupId();

      if (!groupId) {
        console.log('⚠️  Grupo não configurado para ata');
        return;
      }

      // Verificar se o cliente está pronto
      if (!this.client || typeof this.client.sendMessage !== 'function') {
        console.log('⚠️  Cliente WhatsApp não está pronto');
        return;
      }

      console.log('📊 Gerando alerta 14h...');
      const analysis = await analyzer.analyze();

      const message = reportBuilder.buildAlertaIntermediario(analysis);

      if (message) {
        console.log('📱 Enviando alerta 14h...');
        await sendLongMessage(groupId, message);
        console.log('✅ Alerta 14h enviado');
      } else {
        console.log('ℹ️  Sem alertas críticos no momento');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar alerta 14h:', error);
      console.error('Stack trace:', error.stack);
    }
  }

  async sendResumoFimDia() {
    try {
      const groupId = this.getGroupId();
      if (!groupId) {
        console.log('⚠️  Grupo não configurado. Pulando resumo fim do dia.');
        return;
      }

      console.log('📊 Gerando resumo do dia...');
      const analysis = await analyzer.analyze();
      const message = reportBuilder.buildResumoFimDia(analysis);

      await sendLongMessage(groupId, message);
      console.log('✅ Resumo fim do dia enviado');
    } catch (error) {
      console.error('❌ Erro ao enviar resumo fim do dia:', error.message);
    }
  }

  async testNotifications() {
    try {
      console.log('\n🧪 Testando notificações...\n');

      const analysis = await analyzer.analyze();

      console.log('--- RELATÓRIO PÓS-REUNIÃO (08h30) ---');
      console.log(reportBuilder.buildPosReuniao(analysis));

      console.log('\n--- ALERTA INTERMEDIÁRIO (14h) ---');
      const alerta = reportBuilder.buildAlertaIntermediario(analysis);
      console.log(alerta || '(Nenhum alerta necessário)');

      console.log('\n--- RESUMO FIM DO DIA (18h) ---');
      console.log(reportBuilder.buildResumoFimDia(analysis));

      console.log('\n✅ Teste concluído\n');
    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
    }
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('⏹️  Notificador de ata parado');
  }
}

module.exports = AtaNotifier;
