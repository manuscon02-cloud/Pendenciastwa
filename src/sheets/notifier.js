const cron = require('node-cron');
const analyzer = require('./analyzer');
const reportBuilder = require('./reportBuilder');

class AtaNotifier {
  constructor(whatsappClient) {
    this.client = whatsappClient;
    this.jobs = [];
  }

  init(getGroupId) {
    this.getGroupId = getGroupId;

    this.jobs.push(
      cron.schedule('30 8 * * 1-5', () => this.sendPosReuniao(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    this.jobs.push(
      cron.schedule('0 10,12,14,16 * * 1-5', () => this.sendAlertaUrgente(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    // TESTE: Disparo às 16h15 (remover depois)
    this.jobs.push(
      cron.schedule('15 16 * * *', () => {
        console.log('🧪 TESTE: Disparando alerta às 16h15');
        this.sendAlertaUrgente();
      }, {
        timezone: 'America/Sao_Paulo'
      })
    );

    this.jobs.push(
      cron.schedule('0 18 * * 1-5', () => this.sendResumoFimDia(), {
        timezone: 'America/Sao_Paulo'
      })
    );

    console.log('✅ Notificador de ata inicializado');
    console.log('   📅 Pós-reunião: Seg-Sex 08h30');
    console.log('   ⚠️  Alertas urgentes: Seg-Sex 10h, 12h, 14h, 16h');
    console.log('   📊 Resumo fim do dia: Seg-Sex 18h');
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

      await this.client.sendMessage(groupId, message);
      console.log('✅ Relatório pós-reunião enviado');
    } catch (error) {
      console.error('❌ Erro ao enviar relatório pós-reunião:', error.message);
    }
  }

  async sendAlertaUrgente() {
    try {
      const groupId = this.getGroupId();
      console.log('🔍 GroupId da ata:', groupId);
      console.log('🔍 Tipo do groupId:', typeof groupId);

      if (!groupId) {
        console.log('⚠️  Grupo não configurado para ata');
        return;
      }

      // Verificar se o cliente está pronto
      if (!this.client || typeof this.client.sendMessage !== 'function') {
        console.log('⚠️  Cliente WhatsApp não está pronto');
        return;
      }

      console.log('📊 Analisando dados da planilha...');
      const analysis = await analyzer.analyze();
      console.log('✅ Análise concluída:', {
        sc_urgentes: analysis.sc.urgentes,
        sc_total: analysis.sc.total,
        tarefas_atrasadas: analysis.gestao.atrasadas
      });

      const message = reportBuilder.buildAlertaUrgente(analysis);

      if (message) {
        console.log('📱 Enviando mensagem para grupo:', groupId);
        console.log('📝 Tamanho da mensagem:', message.length, 'caracteres');
        console.log('📄 Preview:', message.substring(0, 200));

        await this.client.sendMessage(groupId, message);
        console.log('✅ Alerta urgente enviado');
      } else {
        console.log('ℹ️  Nenhum alerta urgente necessário no momento');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar alerta urgente:', error);
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

      await this.client.sendMessage(groupId, message);
      console.log('✅ Resumo fim do dia enviado');
    } catch (error) {
      console.error('❌ Erro ao enviar resumo fim do dia:', error.message);
    }
  }

  async testNotifications() {
    try {
      console.log('\n🧪 Testando notificações...\n');

      const analysis = await analyzer.analyze();

      console.log('--- RELATÓRIO PÓS-REUNIÃO ---');
      console.log(reportBuilder.buildPosReuniao(analysis));

      console.log('\n--- ALERTA URGENTE ---');
      const alerta = reportBuilder.buildAlertaUrgente(analysis);
      console.log(alerta || '(Nenhum alerta necessário)');

      console.log('\n--- RESUMO FIM DO DIA ---');
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
