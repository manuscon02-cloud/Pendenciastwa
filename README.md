# 🏗️ Bot de Pendências – Obra

Bot de cobrança automática via WhatsApp para gestão de pendências de obra.
Usa `whatsapp-web.js` (gratuito), Node.js e SQLite. Deploy no Railway.

## 🆕 Nova Funcionalidade: Bot de Ata

O bot agora também monitora sua **Ata de Reuniões no Google Sheets** e envia notificações automáticas sobre pendências críticas, SC urgentes e tarefas atrasadas.

📖 **[Ver documentação completa da Ata →](README-ATA.md)**  
⚡ **[Guia de início rápido →](QUICKSTART-ATA.md)**

---

## ⚡ Como funciona

1. Você cadastra as pendências no dashboard com nome do responsável e número WhatsApp
2. O bot envia cobranças no grupo nos horários que você definir
3. O responsável envia uma **foto como comprovante** com o comando `#feito [número]`
4. O bot dá baixa automaticamente — se não responder, continua cobrando
5. Tudo visível em tempo real no dashboard

---

## 🚀 Deploy no Railway (passo a passo)

### 1. Suba o código no GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pendencias-bot.git
git push -u origin main
```

### 2. Crie o projeto no Railway

1. Acesse [railway.app](https://railway.app) → **New Project**
2. Escolha **Deploy from GitHub repo**
3. Selecione o repositório `pendencias-bot`
4. Railway detecta automaticamente o `nixpacks.toml`

### 3. Adicione os Volumes Persistentes (OBRIGATÓRIO)

> ⚠️ Sem volumes, a sessão do WhatsApp é perdida a cada restart!

No Railway, dentro do seu serviço:
1. Aba **Volumes** → **Add Volume**
2. Crie 3 volumes:

| Volume Name        | Mount Path             |
|--------------------|------------------------|
| `whatsapp-session` | `/app/wwebjs_auth`     |
| `database`         | `/app/data`            |
| `uploads`          | `/app/public/uploads`  |

### 4. Configure as variáveis de ambiente

Na aba **Variables** do Railway, adicione:

```
TZ=America/Sao_Paulo
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium
DB_PATH=/app/data/pendencias.db
WWEBJS_AUTH_PATH=/app/wwebjs_auth
UPLOADS_DIR=/app/public/uploads
```

### 5. Acesse o dashboard e escaneie o QR code

1. Abra a URL gerada pelo Railway (ex: `https://pendencias-bot.up.railway.app`)
2. Na aba **Configurações**, o QR code aparece automaticamente
3. Abra o WhatsApp no celular → **Dispositivos Conectados** → **Conectar dispositivo**
4. Escaneie o QR code
5. Selecione o grupo da obra

---

## 📱 Comandos no WhatsApp (grupo)

| Comando | Descrição |
|---|---|
| `#feito [número]` + foto | Conclui a pendência com comprovante |
| `#status` | Lista todas as pendências abertas |
| `#ajuda` | Mostra os comandos disponíveis |

**Exemplo de uso:**
O funcionário tira uma foto da obra concluída e envia no grupo com a legenda:
```
#feito 3
```

---

## 💻 Rodar localmente (para testes)

```bash
npm install
cp .env.example .env
npm start
```

Acesse: http://localhost:3000

---

## 🛠️ Tecnologias

- **whatsapp-web.js** — WhatsApp Web automation (gratuito)
- **Node.js + Express** — Backend e API REST
- **SQLite (better-sqlite3)** — Banco de dados local
- **node-cron** — Agendamento de cobranças
- **Alpine.js** — Dashboard interativo (sem build step)
- **Railway** — Deploy e hospedagem
