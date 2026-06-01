class ReportBuilder {
  buildPosReuniao(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const critical = analysis.sc.detalhes.urgentes.slice(0, 4);
    const tarefasCriticas = analysis.gestao.detalhes.aguardandoAprovacao.slice(0, 3);

    let msg = `📊 *RELATÓRIO PÓS-REUNIÃO* - ${hoje}\n\n`;

    if (analysis.sc.urgentes > 0) {
      msg += `🔴 *SC URGENTES: ${analysis.sc.urgentes}*\n`;
      critical.forEach(sc => {
        const dias = sc.DiasEmAberto || '?';
        const desc = this.truncate(sc.Descricao, 40);
        msg += `• SC ${sc.SC} - ${desc} (${dias} dias)\n`;
      });
      msg += '\n';
    }

    if (analysis.gestao.aguardandoAprovacao > 0 || analysis.gestao.atrasadas > 0) {
      const total = analysis.gestao.aguardandoAprovacao + analysis.gestao.atrasadas;
      msg += `⚠️ *TAREFAS CRÍTICAS: ${total}*\n`;

      if (analysis.gestao.aguardandoAprovacao > 0) {
        msg += `• ${analysis.gestao.aguardandoAprovacao} aguardando aprovação\n`;
      }

      if (analysis.gestao.atrasadas > 0) {
        const setores = Object.entries(analysis.gestao.porSetor)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([setor, qtd]) => `${setor} (${qtd})`)
          .join(', ');
        msg += `• ${analysis.gestao.atrasadas} atrasadas: ${setores}\n`;
      }
      msg += '\n';
    }

    if (analysis.gestao.semPrazo > 0) {
      msg += `📅 *PRAZOS NÃO CADASTRADOS: ${analysis.gestao.semPrazo}*\n`;
      analysis.gestao.detalhes.semPrazo.slice(0, 5).forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        const acao = this.truncate(item.Acao || item.Ocorrencia, 40);
        msg += `• ${resp} - ${acao}\n`;
      });
      msg += '\n';
    }

    if (analysis.sc.aprovadoAtrasado > 0) {
      msg += `📋 *Total: ${analysis.sc.aprovadoAtrasado} SC aprovadas atrasadas*\n`;
    }

    if (!this.hasCriticalIssues(analysis) && analysis.gestao.semPrazo === 0) {
      msg = `📊 *RELATÓRIO PÓS-REUNIÃO* - ${hoje}\n\n`;
      msg += `✅ Tudo sob controle\n`;
      msg += `• ${analysis.gestao.emAndamento} tarefas em andamento\n`;
      msg += `• ${analysis.sc.total} SC em processo\n`;
    }

    return msg.trim();
  }

  buildAlertaUrgente(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `⏰ *ALERTA* - ${hora}\n\n`;

    const urgentes = analysis.sc?.detalhes?.urgentes?.slice(0, 3) || [];
    if (urgentes.length > 0) {
      msg += `🚨 *${urgentes.length} SC URGENTES*\n`;
      urgentes.forEach(sc => {
        const dias = sc.DiasEmAberto || '?';
        const desc = this.truncate(sc.Descricao, 35);
        msg += `• SC ${sc.SC} - ${desc} (${dias}d)\n`;
      });
      msg += '\n';
    }

    const antigas = analysis.sc?.detalhes?.maisAntigas?.slice(0, 3) || [];
    if (antigas.length > 0 && antigas[0]?.DiasEmAberto > 7) {
      msg += `⏳ *SC MAIS ANTIGAS*\n`;
      antigas.slice(0, 2).forEach(sc => {
        const dias = sc.DiasEmAberto || '?';
        const desc = this.truncate(sc.Descricao, 35);
        msg += `• SC ${sc.SC} - ${dias} dias em aberto\n`;
      });
      msg += '\n';
    }

    const prazoHoje = analysis.gestao?.detalhes?.prazoProximo || [];
    if (prazoHoje.length > 0) {
      msg += `📅 *${prazoHoje.length} tarefas com prazo hoje/amanhã*\n`;
    }

    if (urgentes.length === 0 && (!antigas[0] || antigas[0].DiasEmAberto <= 7) && prazoHoje.length === 0) {
      console.log('ℹ️  Nenhum item crítico para alertar');
      return null;
    }

    console.log('✅ Mensagem de alerta construída:', msg.substring(0, 100) + '...');
    return msg.trim();
  }

  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📌 *RESUMO DO DIA* - ${hoje}\n\n`;

    msg += `📊 *Visão Geral*\n`;
    msg += `• SC urgentes: ${analysis.sc.urgentes}\n`;
    msg += `• SC aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n`;
    msg += `• Tarefas atrasadas: ${analysis.gestao.atrasadas}\n`;
    msg += `• Tarefas em andamento: ${analysis.gestao.emAndamento}\n`;
    msg += `• Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n`;
    if (analysis.gestao.semPrazo > 0) {
      msg += `• ⚠️ Sem prazo cadastrado: ${analysis.gestao.semPrazo}\n`;
    }
    msg += '\n';

    if (analysis.sc.urgentes > 0 || analysis.gestao.atrasadas > 0) {
      msg += `⚠️ *Atenção necessária amanhã*\n`;

      if (analysis.sc.urgentes > 0) {
        msg += `• Priorizar ${analysis.sc.urgentes} SC urgentes\n`;
      }

      const setoresTop = Object.entries(analysis.gestao.porSetor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (setoresTop.length > 0) {
        msg += `• Setores com mais pendências:\n`;
        setoresTop.forEach(([setor, qtd]) => {
          msg += `  - ${setor}: ${qtd}\n`;
        });
      }
    } else {
      msg += `✅ Bom trabalho hoje!`;
    }

    return msg.trim();
  }

  hasCriticalIssues(analysis) {
    return analysis.sc.urgentes > 0 ||
           analysis.sc.aprovadoAtrasado > 0 ||
           analysis.gestao.atrasadas > 0 ||
           analysis.gestao.aguardandoAprovacao > 0;
  }

  truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }
}

module.exports = new ReportBuilder();
