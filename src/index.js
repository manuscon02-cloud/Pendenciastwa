require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB } = require('./db/database');
const { initWhatsApp } = require('./bot/whatsapp');
const { handleMessage } = require('./bot/handlers');
const { initScheduler } = require('./scheduler/cron');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(
  process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads')
));
app.use('/api', routes);

app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../public/index.html'))
);

async function start() {
  console.log('🚀 Iniciando sistema de pendências...\n');

  initDB();

  console.log('📱 Inicializando WhatsApp (aguarde o QR code)...');
  initWhatsApp(handleMessage).catch(err =>
    console.error('❌ Erro WhatsApp:', err.message)
  );

  initScheduler();

  app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando na porta ${PORT}`);
    console.log(`📊 Dashboard:  http://localhost:${PORT}`);
    console.log(`📱 QR Code:    http://localhost:${PORT}/api/qr\n`);
  });
}

start().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
