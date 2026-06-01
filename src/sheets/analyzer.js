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

    const atrasadas = data.filter(item =>
      item.Situacao && item.Situacao.toLowerCase().includes('atrasado')
    );

    const emAndamento = data.filter(item =>
      item.Situacao && item.Situacao.toLowerCase().includes('em andamento')
    );

    const prazoProximo = emAndamento.filter(item => {
      if (!item.Prazo) return false;
      const prazo = googleSheets.parseDate(item.Prazo);
      if (!prazo) return false;
      return prazo <= amanha;
    });

    const aguardandoAprovacao = data.filter(item =>
      item.Observacoes &&
      (item.Observacoes.toLowerCase().includes('aguardando aprovação') ||
       item.Observacoes.toLowerCase().includes('aguardando liberação'))
    );

    const semPrazo = data.filter(item =>
      item.Situacao &&
      item.Situacao.toLowerCase().includes('em andamento') &&
      (!item.Prazo || item.Prazo.trim() === '')
    );

    const porSetor = {};
    atrasadas.forEach(item => {
      const setor = item.Setor || 'Sem setor';
      porSetor[setor] = (porSetor[setor] || 0) + 1;
    });

    return {
      total: data.length,
      atrasadas: atrasadas.length,
      emAndamento: emAndamento.length,
      prazoProximo: prazoProximo.length,
      aguardandoAprovacao: aguardandoAprovacao.length,
      semPrazo: semPrazo.length,
      porSetor,
      detalhes: {
        atrasadas: atrasadas.slice(0, 10),
        prazoProximo: prazoProximo.slice(0, 10),
        aguardandoAprovacao: aguardandoAprovacao.slice(0, 5),
        semPrazo: semPrazo.slice(0, 10)
      }
    };
  }

  analyzeSC(data) {
    const urgentes = data.filter(item =>
      item.Situacao && item.Situacao.toUpperCase().includes('URGENTE')
    );

    const aprovadoAtrasado = data.filter(item =>
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
      total: data.length,
      urgentes: urgentes.length,
      aprovadoAtrasado: aprovadoAtrasado.length,
      porResponsavel,
      detalhes: {
        urgentes: urgentes.slice(0, 10),
        maisAntigas: maisAntigas.slice(0, 10),
        aprovadoAtrasado: aprovadoAtrasado.slice(0, 5)
      }
    };
  }

  getCriticalSummary(analysis) {
    const critical = {
      scUrgentes: analysis.sc.urgentes,
      scAtrasadas: analysis.sc.aprovadoAtrasado,
      tarefasAtrasadas: analysis.gestao.atrasadas,
      aguardandoAprovacao: analysis.gestao.aguardandoAprovacao,
      prazoHoje: analysis.gestao.prazoProximo
    };

    critical.hasIssues = critical.scUrgentes > 0 ||
                         critical.scAtrasadas > 0 ||
                         critical.tarefasAtrasadas > 0 ||
                         critical.aguardandoAprovacao > 0;

    return critical;
  }
}

module.exports = new PendenciasAnalyzer();
