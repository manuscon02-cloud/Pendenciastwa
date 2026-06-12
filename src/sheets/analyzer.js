const googleSheets = require('./googleSheets');

class PendenciasAnalyzer {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
  }

  async analyze() {
    const [gestao, sc] = await Promise.all([
      googleSheets.getGestaoCompartilhada(this.spreadsheetId),
      googleSheets.getSolicitacoesCompra(this.spreadsheetId)
    ]);

    return {
      gestao: this.analyzeGestao(gestao),
      sc: this.analyzeSC(sc),
      raw: { gestao, sc }
    };
  }

  analyzeGestao(data) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    // Filtrar apenas itens que não estão concluídos
    const ativos = data.filter(item => {
      // Se tem data de conclusão (coluna K), NÃO é pendente!
      const dataConclusao = (item.DataConclusao || '').trim();
      if (dataConclusao !== '') {
        return false; // TEM data de conclusão = já foi feito = IGNORA
      }

      // Se situação menciona "concluído", também ignora
      const situacao = (item.Situacao || '').toLowerCase();
      if (situacao.includes('concluído') || situacao.includes('concluida')) {
        return false;
      }

      return true; // Passou nos filtros = É PENDENTE
    });

    // Concluídas hoje
    const concluidasHoje = data.filter(item => {
      if (!item.DataConclusao) return false;
      const dataConclusao = googleSheets.parseDate(item.DataConclusao);
      if (!dataConclusao) return false;
      return dataConclusao.toDateString() === hoje.toDateString();
    });

    // CRÍTICO: Atrasadas (venceram ontem ou antes)
    // GARANTIA EXTRA: Mesmo dentro de ativos, re-checar se NÃO tem data de conclusão
    const atrasadas = ativos.filter(item => {
      // Dupla checagem: se tem data conclusão, NUNCA incluir
      if ((item.DataConclusao || '').trim() !== '') return false;

      if (!item.Situacao) return false;
      const situacao = item.Situacao.toLowerCase();
      return situacao.includes('atrasado');
    });

    // Vencendo HOJE especificamente
    const venceHoje = ativos.filter(item => {
      // Dupla checagem: se tem data conclusão, NUNCA incluir
      if ((item.DataConclusao || '').trim() !== '') return false;

      if (!item.Prazo) return false;
      const prazo = googleSheets.parseDate(item.Prazo);
      if (!prazo) return false;
      return prazo.toDateString() === hoje.toDateString();
    });

    // Aguardando aprovação/liberação
    const aguardandoAprovacao = ativos.filter(item => {
      // Dupla checagem: se tem data conclusão, NUNCA incluir
      if ((item.DataConclusao || '').trim() !== '') return false;

      return item.Observacoes &&
        (item.Observacoes.toLowerCase().includes('aguardando aprovação') ||
         item.Observacoes.toLowerCase().includes('aguardando liberação') ||
         item.Observacoes.toLowerCase().includes('aguardando retorno') ||
         item.Observacoes.toLowerCase().includes('aguardando financeiro'));
    });

    return {
      total: ativos.length,
      atrasadas: atrasadas.length,
      venceHoje: venceHoje.length,
      aguardandoAprovacao: aguardandoAprovacao.length,
      concluidasHoje: concluidasHoje.length,
      detalhes: {
        atrasadas,
        venceHoje,
        aguardandoAprovacao,
        concluidasHoje
      }
    };
  }

  analyzeSC(data) {
    // CRÍTICO: Filtrar APENAS SC não encerradas (coluna "Encerrado?" vazia)
    const pendentes = data.filter(item => {
      const encerrado = (item.Encerrado || '').trim().toUpperCase();
      return encerrado === ''; // Vazio = pendente
    });

    // Dentro das pendentes, pegar as URGENTES
    const urgentes = pendentes.filter(item =>
      item.Situacao && item.Situacao.toUpperCase().includes('URGENTE')
    );

    // Dentro das pendentes, pegar as aprovadas atrasadas
    const aprovadoAtrasado = pendentes.filter(item =>
      item.StatusSC && item.StatusSC.toLowerCase().includes('aprovado atrasado')
    );

    // Sem PC (pedido de compras)
    const semPC = pendentes.filter(item => {
      const pc = (item.PC || '').trim();
      return pc === '';
    });

    // Aprovadas no prazo mas sem PC ainda
    const aprovadasSemPC = pendentes.filter(item => {
      const status = (item.StatusSC || '').toLowerCase();
      const pc = (item.PC || '').trim();
      return status.includes('aprovado no prazo') && pc === '';
    });

    // Mais antigas (>10 dias)
    const maisAntigas = [...pendentes]
      .filter(item => {
        const dias = parseInt(item.DiasEmAberto) || 0;
        return dias >= 10;
      })
      .sort((a, b) => {
        const diasA = parseInt(a.DiasEmAberto) || 0;
        const diasB = parseInt(b.DiasEmAberto) || 0;
        return diasB - diasA;
      })
      .slice(0, 5);

    return {
      total: pendentes.length,
      urgentes: urgentes.length,
      aprovadoAtrasado: aprovadoAtrasado.length,
      semPC: semPC.length,
      aprovadasSemPC: aprovadasSemPC.length,
      maisAntigas: maisAntigas.length,
      detalhes: {
        pendentes,
        urgentes,
        aprovadoAtrasado,
        semPC,
        aprovadasSemPC,
        maisAntigas
      }
    };
  }

  getCriticalSummary(analysis) {
    const critical = {
      scUrgentes: analysis.sc.urgentes,
      scAtrasadas: analysis.sc.aprovadoAtrasado,
      scSemPC: analysis.sc.semPC,
      tarefasAtrasadas: analysis.gestao.atrasadas,
      tarefasVenceHoje: analysis.gestao.venceHoje,
      aguardandoAprovacao: analysis.gestao.aguardandoAprovacao
    };

    critical.hasIssues = critical.scUrgentes > 0 ||
                         critical.scAtrasadas > 0 ||
                         critical.scSemPC > 0 ||
                         critical.tarefasAtrasadas > 0 ||
                         critical.tarefasVenceHoje > 0 ||
                         critical.aguardandoAprovacao > 0;

    return critical;
  }
}

module.exports = new PendenciasAnalyzer();
