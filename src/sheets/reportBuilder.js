class ReportBuilder {
  // 08h30 - PÓS-REUNIÃO
  buildPosReuniao(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 RELATÓRIO PÓS-REUNIÃO\n`;
    msg += `📅 ${hoje}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasContent = false;

    // 1. GESTÃO COMPARTILHADA - TAREFAS ATRASADAS
    if (analysis.gestao.atrasadas > 0) {
      hasContent = true;
      msg += `🔴 TAREFAS ATRASADAS (${analysis.gestao.atrasadas})\n\n`;

      analysis.gestao.detalhes.atrasadas.forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const prazo = item.Prazo || 'Sem prazo';
        const obra = item.Obra || '';
        const projeto = item.Projeto || '';
        const obs = item.Observacoes || '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   📍 Obra: ${obra}\n`;
        if (projeto) msg += `   🏗️ Projeto: ${projeto}\n`;
        msg += `   👤 ${resp} | ⏰ Prazo: ${prazo}\n`;
        if (obs) msg += `   💬 ${obs}\n`;
        msg += `\n`;
      });
    }

    // 2. GESTÃO COMPARTILHADA - VENCE HOJE
    if (analysis.gestao.venceHoje > 0) {
      hasContent = true;
      msg += `⚠️ TAREFAS QUE VENCEM HOJE (${analysis.gestao.venceHoje})\n\n`;

      analysis.gestao.detalhes.venceHoje.forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || '';
        const projeto = item.Projeto || '';
        const setor = item.Setor || '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   📍 Obra: ${obra}\n`;
        if (projeto) msg += `   🏗️ Projeto: ${projeto}\n`;
        msg += `   👤 ${resp}`;
        if (setor) msg += ` (${setor})`;
        msg += `\n\n`;
      });
    }

    // 3. GESTÃO COMPARTILHADA - AGUARDANDO APROVAÇÃO
    if (analysis.gestao.aguardandoAprovacao > 0) {
      hasContent = true;
      msg += `⏳ AGUARDANDO APROVAÇÃO/LIBERAÇÃO (${analysis.gestao.aguardandoAprovacao})\n\n`;

      analysis.gestao.detalhes.aguardandoAprovacao.slice(0, 5).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || '';
        const obs = item.Observacoes || '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   📍 Obra: ${obra}\n`;
        msg += `   👤 ${resp}\n`;
        if (obs) msg += `   💬 ${obs}\n`;
        msg += `\n`;
      });

      if (analysis.gestao.aguardandoAprovacao > 5) {
        msg += `   ... e mais ${analysis.gestao.aguardandoAprovacao - 5}\n\n`;
      }
    }

    // 4. SC - URGENTES
    if (analysis.sc.urgentes > 0) {
      hasContent = true;
      msg += `🔴 SC URGENTES (${analysis.sc.urgentes})\n\n`;

      analysis.sc.detalhes.urgentes.forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const obra = sc.Obra || '';
        const projeto = sc.Projeto || '';
        const resp = sc.Responsavel || 'Não definido';
        const dias = sc.DiasEmAberto || '?';

        msg += `${index + 1}. SC ${numero} - ${desc}\n`;
        msg += `   📍 Obra: ${obra}\n`;
        if (projeto) msg += `   🏗️ Projeto: ${projeto}\n`;
        msg += `   👤 ${resp} | ⏰ ${dias} dias em aberto\n\n`;
      });
    }

    // 5. SC - APROVADAS ATRASADAS
    if (analysis.sc.aprovadoAtrasado > 0) {
      hasContent = true;
      msg += `⚠️ SC APROVADAS MAS ATRASADAS (${analysis.sc.aprovadoAtrasado})\n\n`;

      analysis.sc.detalhes.aprovadoAtrasado.slice(0, 5).forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const obra = sc.Obra || '';
        const resp = sc.Responsavel || 'Não definido';
        const obs = sc.Observacao || '';

        msg += `${index + 1}. SC ${numero} - ${desc}\n`;
        msg += `   📍 ${obra}\n`;
        msg += `   👤 ${resp}\n`;
        if (obs) msg += `   💬 ${obs}\n`;
        msg += `\n`;
      });

      if (analysis.sc.aprovadoAtrasado > 5) {
        msg += `   ... e mais ${analysis.sc.aprovadoAtrasado - 5}\n\n`;
      }
    }

    // 6. SC - APROVADAS SEM PC
    if (analysis.sc.aprovadasSemPC > 0) {
      hasContent = true;
      msg += `📋 SC APROVADAS SEM PEDIDO DE COMPRA (${analysis.sc.aprovadasSemPC})\n\n`;

      analysis.sc.detalhes.aprovadasSemPC.slice(0, 5).forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const obra = sc.Obra || '';
        const resp = sc.Responsavel || 'Não definido';

        msg += `${index + 1}. SC ${numero} - ${desc}\n`;
        msg += `   📍 ${obra}\n`;
        msg += `   👤 ${resp}\n\n`;
      });

      if (analysis.sc.aprovadasSemPC > 5) {
        msg += `   ... e mais ${analysis.sc.aprovadasSemPC - 5}\n\n`;
      }
    }

    // 7. RESUMO NUMÉRICO
    if (hasContent) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📊 RESUMO\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `• SC pendentes: ${analysis.sc.total}\n`;
      msg += `  - Urgentes: ${analysis.sc.urgentes}\n`;
      msg += `  - Aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n`;
      msg += `  - Sem PC: ${analysis.sc.aprovadasSemPC}\n\n`;
      msg += `• Tarefas GESTÃO:\n`;
      msg += `  - Atrasadas: ${analysis.gestao.atrasadas}\n`;
      msg += `  - Vencem hoje: ${analysis.gestao.venceHoje}\n`;
      msg += `  - Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      msg += `✅ Nenhuma pendência crítica no momento!\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    return msg.trim();
  }

  // 14h - ALERTA INTERMEDIÁRIO
  buildAlertaIntermediario(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⏰ ALERTA 14H - ${hora}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasContent = false;

    // 1. SC MAIS ANTIGAS (>10 dias)
    if (analysis.sc.maisAntigas > 0) {
      hasContent = true;
      msg += `📦 SC MAIS ANTIGAS (>10 dias)\n\n`;

      analysis.sc.detalhes.maisAntigas.forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const dias = sc.DiasEmAberto || '?';
        const obra = sc.Obra || '';
        const resp = sc.Responsavel || 'Não definido';

        msg += `${index + 1}. SC ${numero} - ${dias} dias\n`;
        msg += `   📝 ${desc}\n`;
        msg += `   📍 ${obra}\n`;
        msg += `   👤 ${resp}\n\n`;
      });
    }

    // 2. TAREFAS QUE VENCERAM ONTEM/HOJE
    if (analysis.gestao.atrasadas > 0 || analysis.gestao.venceHoje > 0) {
      hasContent = true;
      msg += `⚠️ PRAZOS CRÍTICOS\n\n`;

      if (analysis.gestao.atrasadas > 0) {
        msg += `🔴 Atrasadas: ${analysis.gestao.atrasadas}\n`;
        analysis.gestao.detalhes.atrasadas.slice(0, 3).forEach(item => {
          msg += `   • ${item.Acao || 'Sem descrição'} (${item.Responsavel || '?'})\n`;
        });
        msg += `\n`;
      }

      if (analysis.gestao.venceHoje > 0) {
        msg += `⏰ Vencem hoje: ${analysis.gestao.venceHoje}\n`;
        analysis.gestao.detalhes.venceHoje.slice(0, 3).forEach(item => {
          msg += `   • ${item.Acao || 'Sem descrição'} (${item.Responsavel || '?'})\n`;
        });
        msg += `\n`;
      }
    }

    // 3. STATUS GERAL
    if (hasContent) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📊 Status: ${analysis.sc.total} SC pendentes | ${analysis.gestao.atrasadas} tarefas atrasadas\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      return null; // Sem alertas
    }

    return msg.trim();
  }

  // 18h - RESUMO DO DIA
  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 RESUMO DO DIA\n`;
    msg += `📅 ${hoje}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. CONCLUÍDAS HOJE
    if (analysis.gestao.concluidasHoje > 0) {
      msg += `✅ CONCLUÍDAS HOJE (${analysis.gestao.concluidasHoje})\n\n`;

      analysis.gestao.detalhes.concluidasHoje.forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || '';
        const situacao = item.Situacao || '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   📍 ${obra}\n`;
        msg += `   👤 ${resp}`;
        if (situacao.toLowerCase().includes('atrasado')) {
          msg += ` ⚠️ (Concluído com atraso)`;
        } else {
          msg += ` ✅ (No prazo)`;
        }
        msg += `\n\n`;
      });
    } else {
      msg += `ℹ️ Nenhuma tarefa concluída hoje\n\n`;
    }

    // 2. SITUAÇÃO ATUAL
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 SITUAÇÃO ATUAL\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `SC:\n`;
    msg += `• Total pendente: ${analysis.sc.total}\n`;
    msg += `• Urgentes: ${analysis.sc.urgentes}\n`;
    msg += `• Aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n\n`;
    msg += `GESTÃO COMPARTILHADA:\n`;
    msg += `• Atrasadas: ${analysis.gestao.atrasadas}\n`;
    msg += `• Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n`;
    msg += `\n`;

    // 3. PRIORIDADES PARA AMANHÃ
    if (analysis.gestao.atrasadas > 0 || analysis.sc.urgentes > 0) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🎯 PRIORIDADES PARA AMANHÃ\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      if (analysis.gestao.atrasadas > 0) {
        msg += `• Resolver ${analysis.gestao.atrasadas} tarefa(s) atrasada(s)\n`;
      }
      if (analysis.sc.urgentes > 0) {
        msg += `• Atender ${analysis.sc.urgentes} SC urgente(s)\n`;
      }
      if (analysis.sc.aprovadoAtrasado > 0) {
        msg += `• Dar andamento em ${analysis.sc.aprovadoAtrasado} SC aprovada(s)\n`;
      }
    } else {
      msg += `✅ Excelente trabalho hoje! 💪`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    return msg.trim();
  }
}

module.exports = new ReportBuilder();
