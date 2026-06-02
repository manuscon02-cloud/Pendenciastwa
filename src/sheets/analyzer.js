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

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Filtrar apenas itens que não estão concluídos
    const ativos = data.filter(item => {
      const situacao = (item.Situacao || '').toLowerCase();
      const dataConclusao = (item.DataConclusao || '').trim();
      return !situacao.includes('concluído') &&
             !situacao.includes('concluida') &&
             dataConclusao === '';
    });

    // Concluídas hoje
    const concluidasHoje = data.filter(item => {
      if (!item.DataConclusao) return false;
      const dataConclusao = googleSheets.parseDate(item.DataConclusao);
      if (!dataConclusao) return false;
      return dataConclusao.toDateString() === hoje.toDateString();
    });

    const atrasadas = ativos.filter(item =>
      item.Situacao && item.Situacao.toLowerCase().includes('atrasado')
    );

    const emAndamento = ativos.filter(item =>
      item.Situacao && item.Situacao.toLowerCase().includes('em andamento')
    );

    const prazoProximo = emAndamento.filter(item => {
      if (!item.Prazo) return false;
      const prazo = googleSheets.parseDate(item.Prazo);
      if (!prazo) return false;
      return prazo <= amanha;
    });

    const aguardandoAprovacao = ativos.filter(item =>
      item.Observacoes &&
      (item.Observacoes.toLowerCase().includes('aguardando aprovação') ||
       item.Observacoes.toLowerCase().includes('aguardando liberação') ||
       item.Observacoes.toLowerCase().includes('aguardando retorno'))
    );

    // CRÍTICO: itens ativos sem prazo definido
    const semPrazo = ativos.filter(item =>
      (!item.Prazo || item.Prazo.trim() === '')
    );

    const porSetor = {};
    atrasadas.forEach(item => {
      const setor = item.Setor || 'Sem setor';
      porSetor[setor] = (porSetor[setor] || 0) + 1;
    });

    return {
      total: ativos.length,
      atrasadas: atrasadas.length,
      emAndamento: emAndamento.length,
      prazoProximo: prazoProximo.length,
      aguardandoAprovacao: aguardandoAprovacao.length,
      semPrazo: semPrazo.length,
      concluidasHoje: concluidasHoje.length,
      porSetor,
      detalhes: {
        atrasadas,
        prazoProximo,
        aguardandoAprovacao,
        semPrazo,
        concluidasHoje
      }
    };
  }

  analyzeSC(data) {
    // NOVO: Filtrar SC não encerradas (coluna "Encerrado" vazia ou diferente de "SIM")
    const ativas = data.filter(item => {
      const encerrado = (item.Encerrado || '').trim().toUpperCase();
      return encerrado !== 'SIM' && encerrado !== 'X' && encerrado !== 'ENCERRADO';
    });

    const urgentes = ativas.filter(item =>
      item.Situacao && item.Situacao.toUpperCase().includes('URGENTE')
    );

    const aprovadoAtrasado = ativas.filter(item =>
      item.StatusSC && item.StatusSC.toLowerCase().includes('aprovado atrasado')
    );

    const maisAntigas = [...aprovadoAtrasado]
      .sort((a, b) => {
        const diasA = parseInt(a.DiasEmAberto) || 0;
        const diasB = parseInt(b.DiasEmAberto) || 0;
        return diasB - diasA;
      })
      .slice(0, 10);

    const porResponsavel = {};
    aprovadoAtrasado.forEach(item => {
      const resp = item.Responsavel || 'Sem responsável';
      porResponsavel[resp] = (porResponsavel[resp] || 0) + 1;
    });

    return {
      total: ativas.length,
      urgentes: urgentes.length,
      aprovadoAtrasado: aprovadoAtrasado.length,
      porResponsavel,
      detalhes: {
        urgentes,
        maisAntigas,
        aprovadoAtrasado
      }
    };
  }

  getCriticalSummary(analysis) {
    const critical = {
      scUrgentes: analysis.sc.urgentes,
      scAtrasadas: analysis.sc.aprovadoAtrasado,
      tarefasAtrasadas: analysis.gestao.atrasadas,
      aguardandoAprovacao: analysis.gestao.aguardandoAprovacao,
      prazoHoje: analysis.gestao.prazoProximo,
      semPrazo: analysis.gestao.semPrazo
    };

    critical.hasIssues = critical.scUrgentes > 0 ||
                         critical.scAtrasadas > 0 ||
                         critical.tarefasAtrasadas > 0 ||
                         critical.aguardandoAprovacao > 0 ||
                         critical.semPrazo > 0;

    return critical;
  }
}

module.exports = new PendenciasAnalyzer();
