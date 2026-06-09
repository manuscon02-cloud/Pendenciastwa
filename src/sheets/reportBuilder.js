class ReportBuilder {
  // 08h30 - PÓS-REUNIÃO (ENXUTO)
  buildPosReuniao(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📊 BOM DIA - ${hoje}\n\n`;

    // 1. CRÍTICO (máximo 5 itens)
    const criticos = [];

    // SC Urgentes
    if (analysis.sc.detalhes.urgentes?.length > 0) {
      analysis.sc.detalhes.urgentes.slice(0, 3).forEach(sc => {
        criticos.push({
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 40)}`,
          resp: sc.Responsavel,
          urgencia: 1
        });
      });
    }

    // Tarefas atrasadas
    if (analysis.gestao.detalhes.atrasadas?.length > 0) {
      analysis.gestao.detalhes.atrasadas.slice(0, 2).forEach(item => {
        criticos.push({
          texto: `${this.truncate(item.Acao, 40)} - ATRASADO`,
          resp: item.Responsavel,
          prazo: item.Prazo,
          urgencia: 2
        });
      });
    }

    // Tarefas vencendo hoje
    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      analysis.gestao.detalhes.venceHoje.slice(0, 2).forEach(item => {
        criticos.push({
          texto: `${this.truncate(item.Acao, 40)} - VENCE HOJE`,
          resp: item.Responsavel,
          urgencia: 1
        });
      });
    }

    if (criticos.length > 0) {
      msg += `🔴 URGENTE (${criticos.length})\n`;
      criticos.slice(0, 5).forEach(item => {
        msg += `• ${item.texto}`;
        if (item.resp) msg += ` (${item.resp})`;
        msg += `\n`;
      });
      msg += `\n`;
    }

    // 2. ATENÇÃO (resumo)
    const atencao = [];
    if (analysis.sc.aprovadoAtrasado > 0) {
      atencao.push(`${analysis.sc.aprovadoAtrasado} SC aprovadas esperando andamento`);
    }
    if (analysis.sc.aprovadasSemPC > 0) {
      atencao.push(`${analysis.sc.aprovadasSemPC} SC sem pedido de compra`);
    }
    if (analysis.gestao.aguardandoAprovacao > 0) {
      atencao.push(`${analysis.gestao.aguardandoAprovacao} tarefas aguardando aprovação`);
    }

    if (atencao.length > 0) {
      msg += `⚠️ ATENÇÃO\n`;
      atencao.forEach(texto => msg += `• ${texto}\n`);
      msg += `\n`;
    }

    // 3. STATUS GERAL
    msg += `📊 Status: ${analysis.sc.total} SC pendentes | ${analysis.gestao.total} tarefas ativas`;

    return msg.trim();
  }

  // 14h - ALERTA INTERMEDIÁRIO (ENXUTO)
  buildAlertaIntermediario(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `⏰ ${hora} - CHECKPOINT\n\n`;
    let hasContent = false;

    // 1. Ainda pendente hoje (urgente)
    const pendentesHoje = [];

    if (analysis.sc.detalhes.urgentes?.length > 0) {
      analysis.sc.detalhes.urgentes.slice(0, 2).forEach(sc => {
        pendentesHoje.push(`SC ${sc.SC}: ${this.truncate(sc.Descricao, 35)} (${sc.Responsavel || '?'})`);
      });
    }

    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      analysis.gestao.detalhes.venceHoje.slice(0, 2).forEach(item => {
        pendentesHoje.push(`${this.truncate(item.Acao, 35)} (${item.Responsavel || '?'})`);
      });
    }

    if (pendentesHoje.length > 0) {
      hasContent = true;
      msg += `🔴 Ainda pendente hoje:\n`;
      pendentesHoje.forEach(texto => msg += `• ${texto}\n`);
      msg += `\n`;
    }

    // 2. SC mais antigas (>10 dias)
    if (analysis.sc.detalhes.maisAntigas?.length > 0) {
      hasContent = true;
      msg += `⏳ SC mais antigas:\n`;
      analysis.sc.detalhes.maisAntigas.slice(0, 3).forEach(sc => {
        msg += `• SC ${sc.SC}: ${this.truncate(sc.Descricao, 35)} - ${sc.DiasEmAberto} dias\n`;
      });
      msg += `\n`;
    }

    if (hasContent) {
      msg += `📊 ${analysis.sc.total} SC pendentes no total`;
      return msg.trim();
    }

    return null; // Sem alertas
  }

  // 18h - RESUMO DO DIA (ENXUTO)
  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📌 RESUMO DO DIA - ${hoje}\n\n`;

    // 1. CONCLUÍDO HOJE
    if (analysis.gestao.concluidasHoje > 0) {
      msg += `✅ CONCLUÍDO HOJE (${analysis.gestao.concluidasHoje})\n`;

      analysis.gestao.detalhes.concluidasHoje.slice(0, 5).forEach(item => {
        const situacao = (item.Situacao || '').toLowerCase();
        const status = situacao.includes('atrasado') ? 'Atrasado' : 'No prazo';
        msg += `• ${this.truncate(item.Acao, 45)} - ${status} (${item.Responsavel || '?'})\n`;
      });
      msg += `\n`;
    } else {
      msg += `ℹ️ Nenhuma tarefa concluída hoje\n\n`;
    }

    // 2. SITUAÇÃO ATUAL
    msg += `📊 SITUAÇÃO ATUAL\n`;
    msg += `• ${analysis.sc.total} SC pendentes`;
    if (analysis.sc.urgentes > 0) msg += ` (${analysis.sc.urgentes} urgentes)`;
    msg += `\n`;
    msg += `• ${analysis.gestao.total} tarefas em andamento\n\n`;

    // 3. PRIORIDADES PARA AMANHÃ
    if (analysis.gestao.atrasadas > 0 || analysis.sc.urgentes > 0 || analysis.sc.aprovadoAtrasado > 0) {
      msg += `🎯 AMANHÃ\n`;

      if (analysis.gestao.atrasadas > 0) {
        msg += `• Resolver ${analysis.gestao.atrasadas} tarefa(s) atrasada(s)\n`;
      }
      if (analysis.sc.urgentes > 0) {
        msg += `• Atender ${analysis.sc.urgentes} SC urgente(s)\n`;
      }
      if (analysis.sc.aprovadoAtrasado > 0) {
        msg += `• Dar andamento em ${analysis.sc.aprovadoAtrasado} SC aprovada(s)\n`;
      }
      msg += `\nBom descanso! 💪`;
    } else {
      msg += `✅ Excelente trabalho hoje!\nContinue assim amanhã! 💪`;
    }

    return msg.trim();
  }

  // Helper: truncar texto
  truncate(str, maxLen) {
    if (!str) return '';
    str = String(str);
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }
}

module.exports = new ReportBuilder();
