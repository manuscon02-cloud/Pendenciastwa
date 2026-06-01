# 📊 Bot de Ata - Google Sheets + WhatsApp

Sistema automatizado que monitora sua **Ata de Reuniões** no Google Sheets e envia notificações inteligentes no WhatsApp sobre pendências, SC urgentes e tarefas atrasadas.

---

## 🎯 O que o bot faz

### **Notificações Automáticas (Segunda a Sexta)**

| Horário | Tipo | Conteúdo |
|---------|------|----------|
| **07h40** | 📊 Pós-Reunião | Resumo crítico: SC urgentes, tarefas atrasadas, aguardando aprovação |
| **10h, 12h, 14h, 16h** | ⚠️ Alertas | SC urgentes + SC mais antigas + prazos do dia |
| **18h** | 📌 Resumo do Dia | Visão geral consolidada + setores com mais pendências |

### **Monitora 2 Abas da Planilha**

1. **GESTÃO COMPARTILHADA** - pendências do dia a dia
   - Tarefas atrasadas
   - Prazos vencendo hoje/amanhã
   - Itens aguardando aprovação
   - Resumo por setor

2. **SC (Solicitações de Compra)**
   - SC marcadas como URGENTE
   - SC aprovadas atrasadas
   - SC mais antigas (por dias em aberto)

---

## 🚀 Setup Rápido (3 passos)

### **1. Criar Service Account no Google Cloud**

1. Acesse: [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto novo (ou use existente)
3. Vá em: **APIs & Services** → **Credentials**
4. Clique em **Create Credentials** → **Service Account**
5. Preencha:
   - Nome: `bot-ata-whatsapp`
   - Role: `Viewer` (apenas leitura)
6. Clique em **Create Key** → **JSON**
7. Salve o arquivo baixado como `google-credentials.json` na raiz do projeto

### **2. Habilitar Google Sheets API**

1. No Google Cloud Console, vá em: **APIs & Services** → **Library**
2. Busque por: `Google Sheets API`
3. Clique em **Enable**

### **3. Adicionar Service Account à Planilha**

1. Abra o arquivo `google-credentials.json`
2. Copie o email (algo como: `bot-ata-whatsapp@projeto-123456.iam.gserviceaccount.com`)
3. Abra sua planilha no Google Sheets
4. Clique em **Compartilhar**
5. Cole o email da Service Account
6. Permissão: **Visualizador** (Viewer)
7. Clique em **Enviar**

**✅ Pronto!** O bot agora tem acesso de leitura à planilha.

---

## ⚙️ Configurar no Dashboard

1. Acesse: `http://localhost:3000/ata.html`

2. **Habilitar integração**
   - Ative o toggle

3. **ID da Planilha**
   - Copie da URL: `https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit`
   - Cole no campo
   - Clique em **Testar Conexão**

4. **Selecionar Grupo WhatsApp**
   - Clique em **Carregar Grupos**
   - Selecione o grupo "Engenharia"

5. **Testar Notificações**
   - Use os botões para enviar mensagens de teste no grupo

6. **Salvar**

---

## 📁 Estrutura de Arquivos

```
pendencias-bot-twa/
├── google-credentials.json       # ← Credenciais do Google (não versionar!)
├── .env
├── src/
│   ├── sheets/
│   │   ├── googleSheets.js      # Autenticação + leitura das abas
│   │   ├── analyzer.js          # Análise de pendências/SC
│   │   ├── reportBuilder.js     # Formatação das mensagens
│   │   └── notifier.js          # Agendador (cron jobs)
│   └── ...
└── public/
    └── ata.html                  # Dashboard de configuração
```

---

## 🔧 Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# Google Sheets
GOOGLE_SHEET_ID=1RCqibwPE8xSrZ7tK17XWST9hadwlLRykz4geju70YCg
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
```

---

## 🧪 Testar Localmente

```bash
# Instalar dependências
npm install

# Rodar o bot
npm start
```

Acesse:
- Dashboard principal: http://localhost:3000
- Config da ata: http://localhost:3000/ata.html

---

## 📋 Exemplo de Mensagem (Pós-Reunião)

```
📊 RELATÓRIO PÓS-REUNIÃO - 01/06/2026

🔴 SC URGENTES: 4
• SC 15187 - Consumíveis p/ inspeção (3 dias)
• SC 15130 - Consumíveis Caçapava (6 dias)

⚠️ TAREFAS CRÍTICAS: 8
• 3 Compras aguardando aprovação
• 5 tarefas atrasadas (Obra, Logística)

📋 Total: 31 SC aprovadas atrasadas
```

---

## 🔐 Segurança

- ✅ Service Account usa OAuth2 (método oficial do Google)
- ✅ Acesso apenas de **leitura** à planilha
- ✅ Credenciais ficam no servidor (não no código)
- ⚠️ **NUNCA** commite `google-credentials.json` no Git

Adicione ao `.gitignore`:
```
google-credentials.json
```

---

## 🐛 Troubleshooting

### Erro: "Arquivo de credenciais não encontrado"
- Certifique-se de que `google-credentials.json` está na raiz do projeto
- Verifique a variável `GOOGLE_SERVICE_ACCOUNT_PATH` no `.env`

### Erro: "Request had insufficient authentication scopes"
- Verifique se a Service Account foi adicionada à planilha como **Visualizador**
- Confirme que a **Google Sheets API** está habilitada no Google Cloud

### Notificações não enviadas
- Verifique se o grupo WhatsApp está selecionado em `/ata.html`
- Confirme que o bot está conectado ao WhatsApp (QR code)
- Teste manualmente usando os botões de teste no dashboard

### Dados não aparecem no teste
- Verifique se o ID da planilha está correto
- Confirme que as abas se chamam exatamente: `GESTÃO COMPARTILHADA` e `SC`
- Verifique se há dados nas linhas (a partir da linha 4 em GESTÃO, linha 2 em SC)

---

## 🚢 Deploy no Railway

Adicione as variáveis de ambiente no Railway:

```bash
GOOGLE_SHEET_ID=sua-planilha-id
GOOGLE_SERVICE_ACCOUNT_PATH=/app/google-credentials.json
```

E faça upload do arquivo `google-credentials.json` via Railway CLI ou adicione como secret.

---

## 💡 Customização

### Alterar horários das notificações

Edite: `src/sheets/notifier.js`

```javascript
// Linha ~14
cron.schedule('40 7 * * 1-5', () => this.sendPosReuniao(), {
  timezone: 'America/Sao_Paulo'
});
```

### Alterar formato das mensagens

Edite: `src/sheets/reportBuilder.js`

---

## 📞 Suporte

Problemas? Abra uma issue no GitHub ou entre em contato.

**Criado com ❤️ usando whatsapp-web.js + Google Sheets API**
