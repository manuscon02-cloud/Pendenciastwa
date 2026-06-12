const Anthropic = require('@anthropic-ai/sdk');

class ClaudeAnalyzer {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Gera relatório inteligente usando Claude API
   * @param {Object} analysis - Dados brutos do analyzer
   * @param {String} horario - '08h30', '15h30' ou '18h00'
   * @returns {String} Mensagem formatada pela IA
   */
  async gerarRelatorioInteligente(analysis, horario) {
    try {
      console.log(`🤖 Gerando relatório IA para ${horario}...`);

      // Monta dados brutos estruturados
      const dadosBrutos = this.montarDadosBrutos(analysis);

      // Prompt do sistema (baseado no PDF)
      const systemPrompt = this.getSystemPrompt();

      // Escolhe instruções específicas por horário
      const instrucoes = this.getInstrucoesPorHorario(horario, analysis);

      // Chama Claude API
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `${dadosBrutos}\n\n${instrucoes}`
        }]
      });

      const mensagem = message.content[0].text;
      console.log(`✅ Relatório IA gerado (${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`);

      return mensagem;

    } catch (error) {
      console.error('❌ Erro ao gerar relatório com IA:', error.message);

      // Fallback: retorna null para usar o modelo fixo
      return null;
    }
  }

  /**
   * Prompt do sistema (baseado no PDF 2)
   */
  getSystemPrompt() {
    return `Você é um Analista de Operações Inteligente e EDUCADO. Sua tarefa é transformar relatórios brutos de obras em mensagens curtas, limpas e motivadoras para o WhatsApp.

TOM E POSTURA:
• Seja SEMPRE educado, respeitoso e empático
• NUNCA seja agressivo, impaciente ou desrespeitoso
• Use tom colaborativo: "podemos", "vamos", "juntos"
• Reconheça o esforço da equipe, mesmo com dificuldades
• JAMAIS use palavras como: "cobrar", "exigir", "urgente demais", "inadmissível"
• Prefira: "importante", "atenção", "prioridade", "vamos focar"

CONTEXTO IMPORTANTE:
• A empresa passa por uma crise financeira. Existem muitas Solicitações de Compra (SCs) paradas aguardando pagamento.
• REGRA DE OURO: Não cobre os colaboradores pelas SCs pendentes. Trate-as como 'Fila Financeira' ou 'Painel de Compras'.
• Foque o destaque nas 'Tarefas Operacionais' (coletas, visitas, documentos), pois isso é o que a equipe realmente controla.
• Seja um ALIADO da equipe, não um fiscal chato.

ESTRUTURA DA MENSAGEM:
1. ✅ CONCLUÍDO HOJE: Liste brevemente o que foi finalizado (se houver).
2. 🏗 TERMÔMETRO DAS OBRAS: Use 🔴 (Crítico), 🟡 (Atenção) e 🟢 (Estável) para resumir o status das obras baseado no número e urgência das pendências.
3. 🛠 FOCO NA RETA FINAL: Liste as tarefas operacionais pendentes, uma por linha, começando pelo nome do responsável.
4. 💰 PAINEL DE COMPRAS: Informe o total de SCs aguardando verba e cite apenas os 2-3 itens mais críticos para o financeiro.
5. 💡 DICA DA IA: Escreva uma frase curta de incentivo ou estratégia para o momento do dia.

RESTRIÇÕES VISUAIS:
• Proibido usar rótulos como '📍 Obra:', '🎯 Projeto:', '⏰ Prazo:'.
• Use apenas uma linha por item.
• Mantenha a mensagem curta (máximo 2 telas de celular).
• Seja direto e objetivo.

PRIORIZAÇÃO INTELIGENTE:
• "Perfil W para Nestlé" é mais importante que "Caneta Piloto", mesmo que a caneta esteja atrasada há mais tempo.
• Priorize por impacto na obra e valor de negócio, não apenas por data.
• Se uma observação é muito longa, resuma para o essencial (ex: "Aguardando fornecedor").`;
  }

  /**
   * Instruções específicas por horário
   */
  getInstrucoesPorHorario(horario, analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    switch (horario) {
      case '08h30':
        // Modelo "Semáforo" - Planejamento do dia
        return `Horário: 08h30 - Pós-reunião

Gere uma mensagem no estilo "DASHBOARD OPERACIONAL - ${hoje}".

TOM: Educado, colaborativo e motivador. Use "Bom dia!", "Vamos juntos", "Importante atenção".

Use o formato SEMÁFORO:
- 🔴 CRÍTICO: Obras com muitas pendências ou itens bloqueantes (sem alarmar, só informar)
- 🟡 ATENÇÃO: Obras com pendências gerenciáveis
- 🟢 ESTÁVEL: Obras fluindo bem

Comece com ✅ CONCLUÍDO (se tiver algo de ontem/hoje) - CELEBRE o que foi feito!
Depois o TERMÔMETRO com as obras classificadas.
Liste FOCO NA RETA FINAL com ações operacionais diretas (mas sem pressão).
Termine com 💡 DICA DA IA focada em PLANEJAMENTO do dia (empática e colaborativa).

IMPORTANTE: Seja um colega prestativo, não um chefe cobrando!
Máximo 2 telas de celular!`;

      case '15h30':
        // Modelo "Ultra-Focado" - Ação imediata
        return `Horário: 15h - Checkpoint intermediário (14h nas sextas)

Gere uma mensagem no estilo "O QUE IMPORTA AGORA".

TOM: Direto mas GENTIL. Use "Pessoal", "Galera", "Vamos fechar hoje".

Seja objetivo mas educado:
- 🎯 Liste apenas as 3-5 ações mais importantes e FAZÍVEIS AINDA HOJE
- Use formato amigável: "Nome: Ação específica"
- Ignore o que está travado por $
- Seja encorajador, não pressionador

📦 SOBRE AS COMPRAS: Apenas informe o total em fila, SEM cobrar. Tom: "Seguimos aguardando".

💡 DICA DA IA: Sugestão colaborativa para fechar o dia bem.

IMPORTANTE: Tom de colega ajudando, não de chefe cobrando!
Máximo 1,5 telas de celular!`;

      case '18h00':
        // Modelo "Motivacional" - Fechamento do dia
        return `Horário: 18h00 - Resumo do dia

Gere uma mensagem no estilo "RESUMO OPERACIONAL - ${hoje}".

Foque no POSITIVO:
- ✅ PROGRESSO DO DIA: Celebre o que foi concluído (se tiver)
- 🚀 PARA FECHAR O DIA: 2-3 coisas rápidas que podem ser feitas ainda
- 📊 FILA DE ESPERA: SCs aguardando verba (sem cobrar!)

💡 DICA DA IA: Mensagem motivacional de fechamento, reconhecendo o esforço mesmo com as dificuldades financeiras.

Tom: Positivo, reconhecimento, mas realista.
Máximo 2 telas de celular!`;

      default:
        return 'Gere uma mensagem seguindo as instruções do sistema.';
    }
  }

  /**
   * Monta dados brutos estruturados para a IA
   */
  montarDadosBrutos(analysis) {
    let dados = `📊 DADOS BRUTOS DO SISTEMA:\n\n`;

    // GESTÃO (Tarefas operacionais)
    dados += `=== GESTÃO COMPARTILHADA (Tarefas Operacionais) ===\n`;
    dados += `Total ativo: ${analysis.gestao.total}\n`;
    dados += `Atrasadas: ${analysis.gestao.atrasadas}\n`;
    dados += `Vence hoje: ${analysis.gestao.venceHoje}\n`;
    dados += `Concluídas hoje: ${analysis.gestao.concluidasHoje}\n`;
    dados += `Aguardando aprovação: ${analysis.gestao.aguardandoAprovacao}\n\n`;

    // Detalhes de tarefas atrasadas
    if (analysis.gestao.detalhes.atrasadas?.length > 0) {
      dados += `TAREFAS ATRASADAS:\n`;
      analysis.gestao.detalhes.atrasadas.slice(0, 10).forEach(item => {
        dados += `- ${item.Responsavel}: ${item.Acao} (${item.Obra})\n`;
        if (item.Observacoes) dados += `  Obs: ${item.Observacoes}\n`;
      });
      dados += `\n`;
    }

    // Tarefas que vencem hoje
    if (analysis.gestao.detalhes.venceHoje?.length > 0) {
      dados += `TAREFAS VENCENDO HOJE:\n`;
      analysis.gestao.detalhes.venceHoje.forEach(item => {
        dados += `- ${item.Responsavel}: ${item.Acao} (${item.Obra})\n`;
        if (item.Observacoes) dados += `  Obs: ${item.Observacoes}\n`;
      });
      dados += `\n`;
    }

    // Concluídas hoje
    if (analysis.gestao.detalhes.concluidasHoje?.length > 0) {
      dados += `CONCLUÍDO HOJE:\n`;
      analysis.gestao.detalhes.concluidasHoje.forEach(item => {
        dados += `- ${item.Responsavel}: ${item.Acao} (${item.Obra})\n`;
      });
      dados += `\n`;
    }

    // SOLICITAÇÕES DE COMPRA
    dados += `=== SOLICITAÇÕES DE COMPRA (SCs) ===\n`;
    dados += `Total pendente: ${analysis.sc.total}\n`;
    dados += `Urgentes: ${analysis.sc.urgentes}\n`;
    dados += `Aprovadas atrasadas: ${analysis.sc.aprovadoAtrasado}\n`;
    dados += `Sem pedido de compra: ${analysis.sc.semPC}\n\n`;

    // SCs urgentes
    if (analysis.sc.detalhes.urgentes?.length > 0) {
      dados += `SCs URGENTES:\n`;
      analysis.sc.detalhes.urgentes.slice(0, 5).forEach(sc => {
        dados += `- SC ${sc.SC}: ${sc.Descricao} (${sc.Obra}) - ${sc.DiasEmAberto}d\n`;
        if (sc.Observacoes) dados += `  Obs: ${sc.Observacoes}\n`;
      });
      dados += `\n`;
    }

    // SCs aprovadas atrasadas
    if (analysis.sc.detalhes.aprovadoAtrasado?.length > 0) {
      dados += `SCs APROVADAS ATRASADAS:\n`;
      analysis.sc.detalhes.aprovadoAtrasado.slice(0, 5).forEach(sc => {
        dados += `- SC ${sc.SC}: ${sc.Descricao} (${sc.Obra}) - ${sc.DiasEmAberto}d\n`;
      });
      dados += `\n`;
    }

    dados += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    dados += `Agora, gere a mensagem seguindo as instruções do sistema.`;

    return dados;
  }
}

module.exports = ClaudeAnalyzer;
