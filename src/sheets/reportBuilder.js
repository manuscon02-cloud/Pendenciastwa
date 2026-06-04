class ReportBuilder {
  buildPosReuniao(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 RELATÓRIO PÓS-REUNIÃO\n`;
    msg += `📅 ${hoje}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. SC URGENTES (todas, com contexto completo)
    if (analysis.sc.urgentes > 0) {
      msg += `🔴 SC URGENTES (${analysis.sc.urgentes})\n\n`;

      analysis.sc.detalhes.urgentes.forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const resp = sc.Responsavel || 'Não definido';
        const dias = sc.DiasEmAberto || '?';
        const obra = sc.Obra || 'Obra não informada';
        const projeto = sc.Projeto ? ` - ${sc.Projeto}` : '';

        msg += `${index + 1}. SC ${numero} - ${desc}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} | ⏰ ${dias} dias\n\n`;
      });
    }

    // 2. TAREFAS ATRASADAS (top 10, com contexto completo)
    if (analysis.gestao.atrasadas > 0) {
      msg += `⚠️ TAREFAS ATRASADAS (${analysis.gestao.atrasadas})\n\n`;

      analysis.gestao.detalhes.atrasadas.slice(0, 10).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const prazo = item.Prazo || 'Sem prazo';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';
        const setor = item.Setor || 'Setor não informado';
        const obs = item.Observacoes ? `\n   💬 ${item.Observacoes}` : '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} (${setor}) | 📅 ${prazo}${obs}\n\n`;
      });

      if (analysis.gestao.atrasadas > 10) {
        msg += `   ... e mais ${analysis.gestao.atrasadas - 10} tarefas\n\n`;
      }
    }

    // 3. AGUARDANDO APROVAÇÃO (top 10, com contexto)
    if (analysis.gestao.aguardandoAprovacao > 0) {
      msg += `⏳ AGUARDANDO APROVAÇÃO/RETORNO (${analysis.gestao.aguardandoAprovacao})\n\n`;

      analysis.gestao.detalhes.aguardandoAprovacao.slice(0, 10).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';
        const obs = item.Observacoes || 'Sem observação';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp}\n`;
        msg += `   💬 ${obs}\n\n`;
      });

      if (analysis.gestao.aguardandoAprovacao > 10) {
        msg += `   ... e mais ${analysis.gestao.aguardandoAprovacao - 10}\n\n`;
      }
    }

    // 4. CRÍTICO: TAREFAS SEM PRAZO (top 10, com contexto completo)
    if (analysis.gestao.semPrazo > 0) {
      msg += `🚨 URGENTE: PRAZOS NÃO CADASTRADOS (${analysis.gestao.semPrazo})\n\n`;
      msg += `⚠️ Tarefas ativas SEM prazo definido. Cadastrar urgentemente:\n\n`;

      analysis.gestao.detalhes.semPrazo.slice(0, 10).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';
        const setor = item.Setor || 'Setor não informado';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} (${setor})\n\n`;
      });

      if (analysis.gestao.semPrazo > 10) {
        msg += `   ... e mais ${analysis.gestao.semPrazo - 10} tarefas\n\n`;
      }
    }

    // 5. RESUMO NUMÉRICO
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 RESUMO GERAL\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `• SC urgentes: ${analysis.sc.urgentes}\n`;
    msg += `• SC aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n`;
    msg += `• Tarefas atrasadas: ${analysis.gestao.atrasadas}\n`;
    msg += `• Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n`;
    msg += `• ⚠️ Sem prazo: ${analysis.gestao.semPrazo}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return msg.trim();
  }

  buildAlertaUrgente(analysis) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⏰ ALERTA INTERMEDIÁRIO - ${hora}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasContent = false;

    // SC PENDENTES (top 10)
    const pendentes = analysis.sc?.detalhes?.todas?.slice(0, 10) || [];
    if (pendentes.length > 0) {
      hasContent = true;
      const total = analysis.sc?.total || pendentes.length;
      msg += `📋 SC PENDENTES (${total})\n\n`;

      pendentes.forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const resp = sc.Responsavel || 'Não definido';
        const dias = sc.DiasEmAberto || '?';
        const obra = sc.Obra || 'Obra não informada';
        const projeto = sc.Projeto ? ` - ${sc.Projeto}` : '';

        msg += `${index + 1}. SC ${numero} - ${desc}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} | ⏰ ${dias}d\n\n`;
      });

      if (total > 10) {
        msg += `   ... e mais ${total - 10} SC pendentes\n\n`;
      }
    }

    // SC MAIS ANTIGAS (>7 dias, com contexto)
    const antigas = analysis.sc?.detalhes?.maisAntigas?.slice(0, 3) || [];
    if (antigas.length > 0 && antigas[0]?.DiasEmAberto > 7) {
      hasContent = true;
      msg += `⏳ SC MAIS ANTIGAS\n\n`;

      antigas.forEach((sc, index) => {
        const numero = sc.SC || 'S/N';
        const desc = sc.Descricao || 'Sem descrição';
        const dias = sc.DiasEmAberto || '?';
        const obra = sc.Obra || 'Obra não informada';
        const projeto = sc.Projeto ? ` - ${sc.Projeto}` : '';

        msg += `${index + 1}. SC ${numero} - ${dias} dias\n`;
        msg += `   📝 ${desc}\n`;
        msg += `   🏗️ ${obra}${projeto}\n\n`;
      });
    }

    // TAREFAS COM PRAZO HOJE/AMANHÃ (top 10, com contexto)
    const prazoHoje = analysis.gestao?.detalhes?.prazoProximo || [];
    if (prazoHoje.length > 0) {
      hasContent = true;
      msg += `📅 PRAZOS HOJE/AMANHÃ (${prazoHoje.length})\n\n`;

      prazoHoje.slice(0, 10).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const prazo = item.Prazo || '?';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} | 📅 ${prazo}\n\n`;
      });

      if (prazoHoje.length > 10) {
        msg += `   ... e mais ${prazoHoje.length - 10} tarefas\n\n`;
      }
    }

    // COBRANÇA: TAREFAS SEM PRAZO (top 10, com contexto completo)
    if (analysis.gestao.semPrazo > 0) {
      hasContent = true;
      msg += `🚨 SEM PRAZO CADASTRADO (${analysis.gestao.semPrazo})\n\n`;
      msg += `⚠️ Cadastrar prazos URGENTEMENTE:\n\n`;

      analysis.gestao.detalhes.semPrazo.slice(0, 10).forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';
        const setor = item.Setor || 'Setor não informado';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} (${setor})\n\n`;
      });

      if (analysis.gestao.semPrazo > 10) {
        msg += `   ... e mais ${analysis.gestao.semPrazo - 10} tarefas\n\n`;
      }
    }

    if (!hasContent) {
      return null;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    return msg.trim();
  }

  buildResumoFimDia(analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 RESUMO DO DIA\n`;
    msg += `📅 ${hoje}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. ATIVIDADES CONCLUÍDAS HOJE (todas, com contexto completo)
    if (analysis.gestao.concluidasHoje > 0) {
      msg += `✅ CONCLUÍDAS HOJE (${analysis.gestao.concluidasHoje})\n\n`;

      analysis.gestao.detalhes.concluidasHoje.forEach((item, index) => {
        const acao = item.Acao || 'Sem descrição';
        const resp = item.Responsavel || 'Não definido';
        const obra = item.Obra || 'Obra não informada';
        const projeto = item.Projeto ? ` - ${item.Projeto}` : '';
        const setor = item.Setor || 'Setor não informado';
        const obs = item.Observacoes ? `\n   💬 ${item.Observacoes}` : '';

        msg += `${index + 1}. ${acao}\n`;
        msg += `   🏗️ ${obra}${projeto}\n`;
        msg += `   👤 ${resp} (${setor})${obs}\n\n`;
      });
    } else {
      msg += `ℹ️ Nenhuma atividade concluída hoje\n\n`;
    }

    // 2. VISÃO GERAL DO DIA
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 SITUAÇÃO ATUAL\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `• SC urgentes: ${analysis.sc.urgentes}\n`;
    msg += `• SC aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n`;
    msg += `• Tarefas atrasadas: ${analysis.gestao.atrasadas}\n`;
    msg += `• Tarefas em andamento: ${analysis.gestao.emAndamento}\n`;
    msg += `• Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n`;

    if (analysis.gestao.semPrazo > 0) {
      msg += `• ⚠️ Sem prazo: ${analysis.gestao.semPrazo}\n`;
    }
    msg += '\n';

    // 3. PRIORIDADES PARA AMANHÃ
    if (analysis.sc.urgentes > 0 || analysis.gestao.atrasadas > 0 || analysis.gestao.semPrazo > 0) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🎯 PRIORIDADES PARA AMANHÃ\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      if (analysis.sc.urgentes > 0) {
        msg += `• Priorizar ${analysis.sc.urgentes} SC urgentes\n`;
      }

      if (analysis.gestao.atrasadas > 0) {
        const setoresTop = Object.entries(analysis.gestao.porSetor)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        if (setoresTop.length > 0) {
          msg += `• Setores com mais pendências:\n`;
          setoresTop.forEach(([setor, qtd]) => {
            msg += `  - ${setor}: ${qtd}\n`;
          });
        }
      }

      if (analysis.gestao.semPrazo > 0) {
        msg += `\n🚨 URGENTE: CADASTRAR PRAZOS (${analysis.gestao.semPrazo})\n`;

        const responsaveisSemPrazo = {};
        analysis.gestao.detalhes.semPrazo.forEach(item => {
          const resp = item.Responsavel || 'Não definido';
          responsaveisSemPrazo[resp] = (responsaveisSemPrazo[resp] || 0) + 1;
        });

        const topResponsaveis = Object.entries(responsaveisSemPrazo)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);

        topResponsaveis.forEach(([resp, qtd]) => {
          msg += `  • ${resp}: ${qtd} tarefa${qtd > 1 ? 's' : ''}\n`;
        });
      }
    } else {
      msg += `✅ Excelente trabalho hoje!\n`;
      msg += `Continue assim amanhã! 💪`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    return msg.trim();
  }

  // Método para preview/aprovação
  buildPreview(analysis) {
    const preview = {
      timestamp: new Date().toLocaleString('pt-BR'),
      criticas: {
        scUrgentes: analysis.sc.urgentes,
        scAtrasadas: analysis.sc.aprovadoAtrasado,
        tarefasAtrasadas: analysis.gestao.atrasadas,
        aguardandoAprovacao: analysis.gestao.aguardandoAprovacao,
        semPrazo: analysis.gestao.semPrazo,
        concluidasHoje: analysis.gestao.concluidasHoje
      },
      mensagens: {
        posReuniao: this.buildPosReuniao(analysis),
        alerta: this.buildAlertaUrgente(analysis),
        resumoDia: this.buildResumoFimDia(analysis)
      }
    };

    return preview;
  }

  truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }
}

module.exports = new ReportBuilder();
