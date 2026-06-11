class ReportBuilder {
  // 08h30 - PÓS-REUNIÃO (RICO EM INFORMAÇÃO)
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
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 40)}`,
          obra: sc.Obra,
          criticidade: '🔴 URGENTE',
          dias: sc.DiasEmAberto,
          prazo: sc.DataNecessidade,
          obs: sc.Observacoes
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
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 40)}`,
          obra: sc.Obra,
          criticidade: '⚠️ Aprovada atrasada',
          dias: sc.DiasEmAberto,
          prazo: sc.DataNecessidade,
          obs: sc.Observacoes
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
          texto: this.truncate(item.Acao, 40),
          obra: item.Obra,
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
          texto: this.truncate(item.Acao, 40),
          obra: item.Obra,
          criticidade: '⏰ VENCE HOJE',
          prazo: item.Prazo
        });
      });
    }

    // Ordena por quantidade
    const pessoas = Object.entries(porPessoa)
      .sort((a, b) => b[1].length - a[1].length);

    if (pessoas.length > 0) {
      msg += `🔴 CRÍTICO\n\n`;

      pessoas.forEach(([nome, itens]) => {
        msg += `👤 ${nome.toUpperCase()} (${itens.length})\n\n`;

        // Mostra TODOS os itens (sem limite)
        itens.forEach(item => {
          msg += `  • ${item.texto}\n`;
          if (item.obra) msg += `    📍 ${this.truncate(item.obra, 35)}\n`;
          msg += `    ${item.criticidade}`;
          if (item.prazo) msg += ` - Prazo: ${item.prazo}`;
          if (item.dias) msg += ` (${item.dias}d)`;
          msg += `\n`;
          // SEMPRE mostra observação se existir
          if (item.obs && item.obs.trim() !== '') {
            msg += `    💬 Obs: ${this.truncate(item.obs, 50)}\n`;
          }
          msg += `\n`; // Linha em branco entre itens
        });

        msg += `\n`; // Linha em branco entre pessoas
      });
    }

    // COBRANÇA: Itens sem prazo
    const semPrazo = this.getSemPrazo(analysis);
    if (semPrazo.length > 0) {
      msg += `🚨 SEM PRAZO DEFINIDO (${semPrazo.length})\n`;
      msg += `⚠️ CADASTRAR PRAZO URGENTE:\n\n`;

      const porPessoaSemPrazo = {};
      semPrazo.forEach(item => {
        const resp = item.responsavel || 'Sem responsável';
        if (!porPessoaSemPrazo[resp]) porPessoaSemPrazo[resp] = [];
        porPessoaSemPrazo[resp].push(item.texto);
      });

      Object.entries(porPessoaSemPrazo).forEach(([nome, itens]) => {
        msg += `👤 ${nome}\n`;
        itens.slice(0, 3).forEach(texto => {
          msg += `  • ${texto}\n`;
        });
        if (itens.length > 3) msg += `  ... e mais ${itens.length - 3}\n`;
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

  // 14h - CHECKPOINT (MAIS RICO)
  buildAlertaIntermediario(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `⏰ CHECKPOINT ${hora}\n\n`;
    let hasContent = false;

    // Agrupa pendências
    const porPessoa = {};

    // SC Urgentes
    if (analysis.sc.detalhes.urgentes?.length > 0) {
      analysis.sc.detalhes.urgentes.forEach(sc => {
        const resp = sc.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 35)}`,
          obra: this.truncate(sc.Obra, 30),
          dias: sc.DiasEmAberto,
          prazo: sc.DataNecessidade,
          obs: sc.Observacoes
        });
      });
    }

    // Tarefas vencendo hoje
    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      analysis.gestao.detalhes.venceHoje.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];
        porPessoa[resp].push({
          texto: this.truncate(item.Acao, 35),
          obra: this.truncate(item.Obra, 30),
          prazo: item.Prazo,
          obs: item.Observacoes
        });
      });
    }

    const pessoas = Object.entries(porPessoa)
      .sort((a, b) => b[1].length - a[1].length);

    if (pessoas.length > 0) {
      hasContent = true;
      msg += `🔴 Ainda pendente hoje:\n\n`;

      pessoas.forEach(([nome, itens]) => {
        msg += `👤 ${nome} (${itens.length})\n\n`;

        // Mostra TODOS os itens (sem limite)
        itens.forEach(item => {
          msg += `  • ${item.texto}\n`;
          if (item.obra) msg += `    📍 ${item.obra}\n`;
          if (item.prazo) msg += `    ⏰ Prazo: ${item.prazo}`;
          else if (item.dias) msg += `    ⏰ ${item.dias} dias em aberto`;
          msg += `\n`;
          // SEMPRE mostra observação se existir
          if (item.obs && item.obs.trim() !== '') {
            msg += `    💬 Obs: ${this.truncate(item.obs, 50)}\n`;
          }
          msg += `\n`; // Linha em branco entre itens
        });

        msg += `\n`; // Linha em branco entre pessoas
      });
    }

    // COBRANÇA: Sem prazo
    const semPrazo = this.getSemPrazo(analysis);
    if (semPrazo.length > 0) {
      hasContent = true;
      msg += `🚨 SEM PRAZO (${semPrazo.length})\n`;
      msg += `Cadastrar prazo urgente:\n\n`;

      const porPessoaSemPrazo = {};
      semPrazo.forEach(item => {
        const resp = item.responsavel || 'Sem responsável';
        if (!porPessoaSemPrazo[resp]) porPessoaSemPrazo[resp] = [];
        porPessoaSemPrazo[resp].push(item.texto);
      });

      Object.entries(porPessoaSemPrazo).slice(0, 5).forEach(([nome, itens]) => {
        msg += `👤 ${nome}: ${itens.length} item(ns)\n`;
      });
      msg += `\n`;
    }

    // SC mais antigas
    if (analysis.sc.detalhes.maisAntigas?.length > 0) {
      hasContent = true;
      msg += `⏳ SC MAIS ANTIGAS:\n`;
      analysis.sc.detalhes.maisAntigas.slice(0, 3).forEach(sc => {
        msg += `• SC ${sc.SC} - ${sc.DiasEmAberto}d (${sc.Responsavel || '?'})\n`;
        msg += `  ${this.truncate(sc.Descricao, 40)}\n`;
      });
      msg += `\n`;
    }

    if (hasContent) {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📊 ${analysis.sc.total} SC pendentes`;
      return msg.trim();
    }

    return null;
  }

  // 18h - RESUMO DO DIA (RICO)
  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `📌 RESUMO - ${hoje}\n\n`;

    // 1. CONCLUÍDO HOJE
    if (analysis.gestao.concluidasHoje > 0) {
      const porPessoa = {};

      analysis.gestao.detalhes.concluidasHoje.forEach(item => {
        const resp = item.Responsavel || 'Sem responsável';
        if (!porPessoa[resp]) porPessoa[resp] = [];

        const situacao = (item.Situacao || '').toLowerCase();
        const status = situacao.includes('atrasado') ? '⚠️ Atrasado' : '✅ No prazo';

        porPessoa[resp].push({
          texto: item.Acao || 'Sem descrição', // TEXTO COMPLETO - sem truncar
          obra: item.Obra || '', // TEXTO COMPLETO - sem truncar
          status,
          obs: item.Observacoes
        });
      });

      msg += `✅ CONCLUÍDO HOJE (${analysis.gestao.concluidasHoje})\n\n`;

      Object.entries(porPessoa).forEach(([nome, itens]) => {
        msg += `👤 ${nome}\n`;
        itens.forEach(item => {
          msg += `  • ${item.texto} ${item.status}\n`;
          if (item.obra) msg += `    📍 ${item.obra}\n`;
          // SEMPRE mostra observação se existir
          if (item.obs && item.obs.trim() !== '') {
            msg += `    💬 Obs: ${item.obs}\n`; // SEM TRUNCAR no resumo 18h
          }
        });
        msg += `\n`;
      });
    } else {
      msg += `ℹ️ Nenhuma tarefa concluída hoje\n\n`;
    }

    // COBRANÇA: Sem prazo
    const semPrazo = this.getSemPrazo(analysis);
    if (semPrazo.length > 0) {
      msg += `🚨 SEM PRAZO (${semPrazo.length})\n`;
      msg += `Cadastrar AMANHÃ:\n\n`;

      const porPessoaSemPrazo = {};
      semPrazo.forEach(item => {
        const resp = item.responsavel || 'Sem responsável';
        if (!porPessoaSemPrazo[resp]) porPessoaSemPrazo[resp] = [];
        porPessoaSemPrazo[resp].push(item.texto);
      });

      Object.entries(porPessoaSemPrazo).slice(0, 5).forEach(([nome, itens]) => {
        msg += `👤 ${nome}: ${itens.length}\n`;
      });
      msg += `\n`;
    }

    // 2. SITUAÇÃO ATUAL
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 SITUAÇÃO ATUAL\n`;
    msg += `• ${analysis.sc.total} SC pendentes`;
    if (analysis.sc.urgentes > 0) msg += ` (${analysis.sc.urgentes} urgentes)`;
    msg += `\n• ${analysis.gestao.total} tarefas ativas\n\n`;

    // 3. PRIORIDADES AMANHÃ (DETALHADO)
    const totalPrioridades = analysis.gestao.atrasadas + analysis.sc.urgentes + analysis.sc.aprovadoAtrasado;

    if (totalPrioridades > 0) {
      msg += `🎯 PRIORIDADES AMANHÃ\n\n`;

      // Agrupa por pessoa
      const prioridadesPorPessoa = {};

      // Tarefas atrasadas
      if (analysis.gestao.detalhes.atrasadas?.length > 0) {
        analysis.gestao.detalhes.atrasadas.forEach(item => {
          const resp = item.Responsavel || 'Sem responsável';
          if (!prioridadesPorPessoa[resp]) prioridadesPorPessoa[resp] = [];
          prioridadesPorPessoa[resp].push({
            tipo: '🔴 TAREFA ATRASADA',
            texto: item.Acao || 'Sem descrição', // COMPLETO
            obra: item.Obra || '',
            prazo: item.Prazo,
            obs: item.Observacoes
          });
        });
      }

      // SC urgentes
      if (analysis.sc.detalhes.urgentes?.length > 0) {
        analysis.sc.detalhes.urgentes.forEach(sc => {
          const resp = sc.Responsavel || 'Sem responsável';
          if (!prioridadesPorPessoa[resp]) prioridadesPorPessoa[resp] = [];
          prioridadesPorPessoa[resp].push({
            tipo: '🔴 SC URGENTE',
            texto: `SC ${sc.SC}: ${sc.Descricao || ''}`, // COMPLETO
            obra: sc.Obra || '',
            prazo: sc.DataNecessidade,
            dias: sc.DiasEmAberto,
            obs: sc.Observacoes
          });
        });
      }

      // SC aprovadas atrasadas
      if (analysis.sc.detalhes.aprovadoAtrasado?.length > 0) {
        analysis.sc.detalhes.aprovadoAtrasado.forEach(sc => {
          const resp = sc.Responsavel || 'Sem responsável';
          if (!prioridadesPorPessoa[resp]) prioridadesPorPessoa[resp] = [];
          prioridadesPorPessoa[resp].push({
            tipo: '⚠️ SC APROVADA ATRASADA',
            texto: `SC ${sc.SC}: ${sc.Descricao || ''}`, // COMPLETO
            obra: sc.Obra || '',
            prazo: sc.DataNecessidade,
            dias: sc.DiasEmAberto,
            obs: sc.Observacoes
          });
        });
      }

      // Renderiza por pessoa
      Object.entries(prioridadesPorPessoa)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([nome, itens]) => {
          msg += `👤 ${nome.toUpperCase()} (${itens.length})\n\n`;

          itens.forEach(item => {
            msg += `  ${item.tipo}\n`;
            msg += `  • ${item.texto}\n`;
            if (item.obra) msg += `    📍 ${item.obra}\n`;
            if (item.prazo) msg += `    ⏰ Prazo: ${item.prazo}`;
            if (item.dias) msg += ` (${item.dias}d em aberto)`;
            if (item.prazo || item.dias) msg += `\n`;
            // SEMPRE mostra observação se existir - SEM TRUNCAR
            if (item.obs && item.obs.trim() !== '') {
              msg += `    💬 Obs: ${item.obs}\n`;
            }
            msg += `\n`;
          });
        });

      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `Bom descanso! 💪`;
    } else {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `✅ Excelente! Tudo em dia!\nContinue assim amanhã! 💪`;
    }

    return msg.trim();
  }

  // HELPER: Identifica itens sem prazo
  getSemPrazo(analysis) {
    const semPrazo = [];

    // Tarefas da GESTÃO sem prazo
    if (analysis.gestao.detalhes?.atrasadas) {
      analysis.gestao.detalhes.atrasadas.forEach(item => {
        if (!item.Prazo || item.Prazo.trim() === '') {
          semPrazo.push({
            responsavel: item.Responsavel,
            texto: this.truncate(item.Acao, 40)
          });
        }
      });
    }

    // SC sem data de necessidade
    if (analysis.sc.detalhes?.urgentes) {
      analysis.sc.detalhes.urgentes.forEach(sc => {
        if (!sc.DataNecessidade || sc.DataNecessidade.trim() === '') {
          semPrazo.push({
            responsavel: sc.Responsavel,
            texto: `SC ${sc.SC}: ${this.truncate(sc.Descricao, 30)}`
          });
        }
      });
    }

    return semPrazo;
  }

  // Helper: truncar texto
  truncate(str, maxLen) {
    if (!str) return '';
    str = String(str);
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }
}

module.exports = new ReportBuilder();
