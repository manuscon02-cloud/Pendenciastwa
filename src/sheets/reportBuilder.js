class ReportBuilder {
  // 08h30 - PÓS-REUNIÃO (AGRUPADO POR PESSOA)
  buildPosReuniao(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📊 BOM DIA - ${hoje}\n\n`;

    // Agrupa todos os itens críticos por pessoa
    const porPessoa = {};

    // 1. SC Urgentes
    if (analysis.sc.detalhes.urgentes?.length > 0) {
      analysis.sc.detalhes.urgentes.forEach(sc => {
        const resp = sc.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          tipo: 'SC',
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 45)}`,
          criticidade: '🔴 URGENTE',
          dias: sc.DiasEmAberto
        });
      });
    }

    // 2. SC Aprovadas Atrasadas
    if (analysis.sc.detalhes.aprovadoAtrasado?.length > 0) {
      analysis.sc.detalhes.aprovadoAtrasado.forEach(sc => {
        const resp = sc.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          tipo: 'SC',
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 45)}`,
          criticidade: '⚠️ Aprovada atrasada',
          dias: sc.DiasEmAberto
        });
      });
    }

    // 3. Tarefas Atrasadas
    if (analysis.gestao.detalhes.atrasadas?.length > 0) {
      analysis.gestao.detalhes.atrasadas.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          tipo: 'TAREFA',
          texto: this.truncate(item.Acao, 45),
          criticidade: `🔴 ATRASADO`,
          prazo: item.Prazo,
          obs: item.Observacoes
        });
      });
    }

    // 4. Tarefas vencendo HOJE
    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      analysis.gestao.detalhes.venceHoje.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          tipo: 'TAREFA',
          texto: this.truncate(item.Acao, 45),
          criticidade: '⏰ VENCE HOJE',
          prazo: item.Prazo
        });
      });
    }

    // Ordena por quantidade (quem tem mais pendências aparece primeiro)
    const pessoas = Object.entries(porPessoa)
      .sort((a, b) => b[1].length - a[1].length);

    if (pessoas.length > 0) {
      msg += `🔴 CRÍTICO\n\n`;

      // Mostra cada pessoa
      pessoas.forEach(([nome, itens]) => {
        msg += `👤 ${nome.toUpperCase()} (${itens.length})\n`;

        // Mostra até 5 itens por pessoa
        itens.slice(0, 5).forEach(item => {
          msg += `  • ${item.texto}\n`;
          msg += `    ${item.criticidade}`;
          if (item.prazo) msg += ` - Prazo: ${item.prazo}`;
          if (item.dias) msg += ` - ${item.dias}d`;
          msg += `\n`;
        });

        if (itens.length > 5) {
          msg += `  ... e mais ${itens.length - 5}\n`;
        }

        msg += `\n`;
      });
    }

    // Resumo geral
    const resumo = [];
    if (analysis.sc.aprovadasSemPC > 0) {
      resumo.push(`${analysis.sc.aprovadasSemPC} SC sem pedido de compra`);
    }
    if (analysis.gestao.aguardandoAprovacao > 0) {
      resumo.push(`${analysis.gestao.aguardandoAprovacao} tarefas aguardando aprovação`);
    }

    if (resumo.length > 0) {
      msg += `⚠️ ATENÇÃO\n`;
      resumo.forEach(r => msg += `• ${r}\n`);
      msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 Total: ${analysis.sc.total} SC | ${analysis.gestao.total} tarefas`;

    return msg.trim();
  }

  // 14h - CHECKPOINT (AGRUPADO POR PESSOA)
  buildAlertaIntermediario(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `⏰ CHECKPOINT ${hora}\n\n`;
    let hasContent = false;

    // Agrupa pendências de hoje por pessoa
    const porPessoa = {};

    // SC Urgentes
    if (analysis.sc.detalhes.urgentes?.length > 0) {
      analysis.sc.detalhes.urgentes.forEach(sc => {
        const resp = sc.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push(`SC ${sc.SC}: ${this.truncate(sc.Descricao, 40)}`);
      });
    }

    // Tarefas vencendo hoje
    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      analysis.gestao.detalhes.venceHoje.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push(this.truncate(item.Acao, 40));
      });
    }

    const pessoas = Object.entries(porPessoa);

    if (pessoas.length > 0) {
      hasContent = true;
      msg += `🔴 Ainda pendente hoje:\n\n`;

      pessoas.forEach(([nome, itens]) => {
        msg += `👤 ${nome}\n`;
        itens.slice(0, 3).forEach(texto => {
          msg += `  • ${texto}\n`;
        });
        if (itens.length > 3) msg += `  ... e mais ${itens.length - 3}\n`;
        msg += `\n`;
      });
    }

    // SC mais antigas
    if (analysis.sc.detalhes.maisAntigas?.length > 0) {
      hasContent = true;
      msg += `⏳ SC mais antigas:\n`;
      analysis.sc.detalhes.maisAntigas.slice(0, 3).forEach(sc => {
        msg += `• SC ${sc.SC} - ${sc.DiasEmAberto}d (${sc.Responsavel || '?'})\n`;
      });
      msg += `\n`;
    }

    if (hasContent) {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📊 ${analysis.sc.total} SC pendentes`;
      return msg.trim();
    }

    return null; // Sem alertas
  }

  // 18h - RESUMO DO DIA (AGRUPADO POR PESSOA)
  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📌 RESUMO - ${hoje}\n\n`;

    // 1. CONCLUÍDO HOJE (agrupado por pessoa)
    if (analysis.gestao.concluidasHoje > 0) {
      const porPessoa = {};

      analysis.gestao.detalhes.concluidasHoje.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];

        const situacao = (item.Situacao || '').toLowerCase();
        const status = situacao.includes('atrasado') ? '⚠️ Atrasado' : '✅ No prazo';

        porPessoa[resp].push({
          texto: this.truncate(item.Acao, 40),
          status
        });
      });

      msg += `✅ CONCLUÍDO HOJE (${analysis.gestao.concluidasHoje})\n\n`;

      Object.entries(porPessoa).forEach(([nome, itens]) => {
        msg += `👤 ${nome}\n`;
        itens.forEach(item => {
          msg += `  • ${item.texto} ${item.status}\n`;
        });
        msg += `\n`;
      });
    } else {
      msg += `ℹ️ Nenhuma tarefa concluída hoje\n\n`;
    }

    // 2. SITUAÇÃO ATUAL
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 SITUAÇÃO ATUAL\n`;
    msg += `• ${analysis.sc.total} SC pendentes`;
    if (analysis.sc.urgentes > 0) msg += ` (${analysis.sc.urgentes} urgentes)`;
    msg += `\n• ${analysis.gestao.total} tarefas ativas\n\n`;

    // 3. PRIORIDADES PARA AMANHÃ
    const totalPrioridades = analysis.gestao.atrasadas + analysis.sc.urgentes + analysis.sc.aprovadoAtrasado;

    if (totalPrioridades > 0) {
      msg += `🎯 AMANHÃ\n`;

      if (analysis.gestao.atrasadas > 0) {
        msg += `• ${analysis.gestao.atrasadas} tarefa(s) atrasada(s)\n`;
      }
      if (analysis.sc.urgentes > 0) {
        msg += `• ${analysis.sc.urgentes} SC urgente(s)\n`;
      }
      if (analysis.sc.aprovadoAtrasado > 0) {
        msg += `• ${analysis.sc.aprovadoAtrasado} SC aprovada(s) atrasada(s)\n`;
      }

      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `Bom descanso! 💪`;
    } else {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `✅ Excelente! Tudo em dia!\n`;
      msg += `Continue assim amanhã! 💪`;
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
