# 🚀 Início Rápido - Bot de Ata

## ⚡ 5 minutos para configurar

### **Passo 1: Criar Service Account (2min)**

1. Acesse: https://console.cloud.google.com/
2. Crie projeto: `bot-ata-empresa`
3. Menu → **APIs & Services** → **Credentials**
4. **Create Credentials** → **Service Account**
   - Nome: `bot-ata`
   - Role: **Viewer**
5. Clique na service account criada → **Keys** → **Add Key** → **JSON**
6. Salve o arquivo como `google-credentials.json` na raiz do projeto

### **Passo 2: Habilitar API (30s)**

1. Menu → **APIs & Services** → **Library**
2. Busque: `Google Sheets API`
3. Clique em **Enable**

### **Passo 3: Compartilhar Planilha (1min)**

1. Abra `google-credentials.json`
2. Copie o `client_email` (ex: `bot-ata@projeto.iam.gserviceaccount.com`)
3. Abra sua planilha Google Sheets
4. **Compartilhar** → Cole o email → **Visualizador** → Enviar

### **Passo 4: Configurar Bot (1min)**

```bash
# 1. Instale dependências
npm install

# 2. Configure .env
cp .env.example .env
# Edite .env e adicione o ID da planilha

# 3. Inicie o bot
npm start
```

### **Passo 5: Ativar no Dashboard (30s)**

1. Acesse: http://localhost:3000/ata.html
2. Ative o toggle "Habilitar Integração"
3. Clique em **Testar Conexão** (deve mostrar números)
4. Clique em **Carregar Grupos** → Selecione "Engenharia"
5. Teste com **📊 Pós-Reunião**
6. **Salvar Configurações**

---

## ✅ Verificar se está funcionando

Execute no terminal:

```bash
node -e "
const googleSheets = require('./src/sheets/googleSheets');
const analyzer = require('./src/sheets/analyzer');

(async () => {
  await googleSheets.authenticate();
  const analysis = await analyzer.analyze();
  console.log('✅ Funcionando!');
  console.log('Tarefas atrasadas:', analysis.gestao.atrasadas);
  console.log('SC urgentes:', analysis.sc.urgentes);
})();
"
```

---

## 📅 Horários Automáticos

Após configurado, o bot enviará mensagens automaticamente:

- **07h40** - Relatório pós-reunião (seg-sex)
- **10h, 12h, 14h, 16h** - Alertas urgentes (seg-sex)
- **18h** - Resumo do dia (seg-sex)

---

## 🆘 Problemas?

**Erro de autenticação?**
- Verifique se o email da Service Account foi adicionado à planilha
- Confirme que o arquivo `google-credentials.json` está na raiz

**Teste de conexão falha?**
- Verifique se o ID da planilha está correto
- Confirme que as abas se chamam: `GESTÃO COMPARTILHADA` e `SC`

**Notificações não chegam?**
- Verifique se o grupo foi selecionado em `/ata.html`
- Confirme que o WhatsApp está conectado (escaneie QR code em `/`)

---

## 📖 Documentação Completa

Veja: `README-ATA.md`
