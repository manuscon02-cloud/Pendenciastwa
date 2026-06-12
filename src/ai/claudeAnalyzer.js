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
   * Prompt do sistema (baseado nas diretrizes do usuário)
   */
  getSystemPrompt() {
    return `Você é um Analista de Operações Estratégico. Sua missão é transformar relatórios brutos em um Dashboard de WhatsApp limpo e eficiente.

DIRETRIZES DE PENSAMENTO:

1. Sensibilidade Financeira: A empresa aguarda liberações de verba. Nunca use tom de cobrança para as Solicitações de Compra (SCs). Trate-as como 'Painel de Compras'.

2. Destaque Operacional: O foco total deve ser nas tarefas de campo (coletas, visitas, documentos).

3. Hierarquia Visual: Use emojis e negritos para guiar o olho do leitor.

ESTRUTURA DA MENSAGEM:

A. Cabeçalho:
• Se for entre 07:00 e 11:00: Use o título '☀️ PRIORIDADES DO DIA'.
• Se for após as 15:00: Use o título '⏰ RETA FINAL'.
• Inclua a data no formato DD/MM (SEM ano) e o horário atual.

B. ✅ CONCLUÍDO HOJE:
• Liste 1 ou 2 sucessos recentes para motivar o time.
• Se não tiver nada, pule esta seção.

C. 🏗️ TERMÔMETRO DAS OBRAS:
• Resuma o status das obras principais usando:
  🔴 [Nome da Obra]: Para obras com impedimentos críticos ou muitas pendências.
  🟡 [Nome da Obra]: Para obras com atenção necessária ou aguardando logística.
  🟢 [Nome da Obra]: Para obras com fluxo normal.
• Escreva apenas uma frase curta de explicação para cada.

D. 🛠️ TAREFAS (Ações Reais):
• Liste as tarefas operacionais.
• REGRA OBRIGATÓRIA: O nome do responsável deve vir primeiro, em CAIXA ALTA e entre asteriscos.
  Exemplo: *JEFFERSON*: Finalizar planilha de coleta
• Use apenas uma linha por tarefa.

E. 💰 PAINEL DE COMPRAS:
• Informe o número total de SCs na fila.
• Cite 2 ou 3 itens que são prioridade máxima para o financeiro liberar (ex: Perfil W).
• Tom neutro, sem cobrar a equipe.

F. 💡 DICA DA IA:
• Crie uma frase de encerramento estratégica e motivadora baseada nos dados do dia.

REGRAS VISUAIS OBRIGATÓRIAS:
• Proibido usar rótulos como '📍 Obra:', '🎯 Projeto:', '📋 Contexto:', '⏰ Prazo:'.
• Use apenas uma linha por item na seção de tarefas.
• Datas SEMPRE no formato DD/MM (ex: 12/06 e NÃO 12/06/2026).
• Mantenha mensagem curta (máximo 2 telas de celular).

FORMATAÇÃO DE NEGRITO NO WHATSAPP:
• Para negrito funcionar: asteriscos COLADOS no texto, SEM espaços
  ✅ CORRETO: *JEFFERSON*: Tarefa tal
  ❌ ERRADO: *Prioridades para liberação de verba: * (aparece os asteriscos)
• Use negrito APENAS para nomes de responsáveis
• Títulos de seções NÃO precisam de negrito (já têm emojis)
  ✅ Use: "💰 PAINEL DE COMPRAS:" (sem asteriscos)
  ❌ Não: "*💰 PAINEL DE COMPRAS:*" (mostra os asteriscos)

INTERPRETAÇÃO INTELIGENTE DE DATAS:
• Você receberá a DATA DE HOJE e DIA DA SEMANA nos dados brutos.
• Se uma tarefa menciona "chegou hoje (10/06)" mas hoje é 12/06, ADAPTE a redação:
  ❌ NÃO escreva: "Confirmar se topografia chegou hoje (10/06)"
  ✅ ESCREVA: "Confirmar se topografia chegou dia 10/06"
• Se a data é PASSADA: use "chegou", "foi feito", "ocorreu"
• Se a data é HOJE: use "hoje" sem mencionar a data
• Se a data é FUTURA: use "vai chegar", "previsto para"
• NUNCA copie literalmente "hoje (data passada)" - isso confunde a equipe!

REGRA ESPECIAL - SEXTA-FEIRA:
• Se HOJE é SEXTA-FEIRA, NUNCA use "amanhã" ou "para amanhã"!
• Sábado e domingo geralmente NÃO são dias úteis (90% dos casos).
• Use estas expressões:
  ✅ "na próxima semana"
  ✅ "na segunda-feira"
  ✅ "para segunda"
  ❌ NÃO use: "amanhã", "para amanhã" (confunde, parece que vai trabalhar sábado)
• Na DICA DA IA de sexta: deseje "bom fim de semana" ao invés de "até amanhã"

PRIORIZAÇÃO INTELIGENTE:
• "Perfil W para Nestlé" é mais importante que "Caneta Piloto", mesmo que a caneta esteja atrasada há mais tempo.
• Priorize por impacto na obra e valor de negócio, não apenas por data.
• Se uma observação é muito longa, resuma para o essencial.`;
  }

  /**
   * Instruções específicas por horário
   */
  getInstrucoesPorHorario(horario, analysis) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    switch (horario) {
      case '08h30':
        // Modelo manhã - Planejamento do dia
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataSimples = hoje.split('/').slice(0, 2).join('/'); // Remove ano (DD/MM)

        return `Horário atual: ${horaAtual}
Data: ${dataSimples}

Gere uma mensagem seguindo EXATAMENTE as instruções do sistema.

CABEÇALHO: Use "☀️ PRIORIDADES DO DIA - ${dataSimples} às ${horaAtual}"

ESTRUTURA OBRIGATÓRIA:
1. ✅ CONCLUÍDO HOJE (se tiver)
2. 🏗️ TERMÔMETRO DAS OBRAS (🔴🟡🟢)
3. 🛠️ TAREFAS
   FORMATO: *NOME_RESPONSÁVEL*: Ação específica
4. 💰 PAINEL DE COMPRAS
5. 💡 DICA DA IA

LEMBRE-SE:
- Responsáveis em CAIXA ALTA entre asteriscos
- Datas sem ano (DD/MM)
- SEM rótulos '📍 Obra:', '🎯 Projeto:'
- INTERPRETE DATAS: se tarefa diz "chegou hoje (10/06)" mas hoje é 12/06,
  escreva "Confirmar se topografia chegou dia 10/06" (SEM "hoje")
- Máximo 2 telas`;

      case '15h30':

      case '15h30':
        // Modelo tarde - Reta final
        const horaAtual2 = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataSimples2 = hoje.split('/').slice(0, 2).join('/'); // Remove ano

        return `Horário atual: ${horaAtual2}
Data: ${dataSimples2}

Gere uma mensagem seguindo EXATAMENTE as instruções do sistema.

CABEÇALHO: Use "⏰ RETA FINAL - ${dataSimples2} às ${horaAtual2}"

ESTRUTURA OBRIGATÓRIA:
1. ✅ CONCLUÍDO HOJE (se tiver)
2. 🏗️ TERMÔMETRO DAS OBRAS (🔴🟡🟢)
3. 🛠️ TAREFAS (apenas o que dá pra fazer HOJE ainda)
   FORMATO: *NOME_RESPONSÁVEL*: Ação específica
4. 💰 PAINEL DE COMPRAS
5. 💡 DICA DA IA (sobre fechar bem o dia)

LEMBRE-SE:
- Responsáveis em CAIXA ALTA entre asteriscos (SEM espaço: *NOME*:)
- Títulos de seção SEM asteriscos (já têm emoji)
- Datas sem ano (DD/MM)
- SEM rótulos '📍 Obra:', '🎯 Projeto:'
- INTERPRETE DATAS: se diz "chegou hoje (10/06)" mas hoje é 12/06,
  escreva "Confirmar se topografia chegou dia 10/06"
- SE HOJE É SEXTA: use "segunda-feira" ou "próxima semana", NUNCA "amanhã"
- Foco no que é FAZÍVEL ainda hoje
- Máximo 1,5 telas`;

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
    const hoje = new Date();
    const hojeBR = hoje.toLocaleDateString('pt-BR');
    const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' });

    let dados = `📊 DADOS BRUTOS DO SISTEMA\n\n`;
    dados += `DATA DE HOJE: ${hojeBR} (${diaSemana})\n`;
    dados += `IMPORTANTE: Use esta data como referência para interpretar prazos!\n\n`;

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
