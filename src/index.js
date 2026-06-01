require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB, getDB } = require('./db/database');
const { initWhatsApp, getClient } = require('./bot/whatsapp');
const { handleMessage } = require('./bot/handlers');
const { initScheduler } = require('./scheduler/cron');
const routes = require('./api/routes');
const AtaNotifier = require('./sheets/notifier');
const googleSheets = require('./sheets/googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(
  process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads')
));
app.use('/api', routes);

app.get('/', (_, res) =>
  res.sendFile(path.join(__dirname, '../public/index.html'))
);

// ── Aplica GROUP_ID/GROUP_NAME do env var (persiste mesmo após reset do banco) ─
function applyEnvConfig(db) {
  const groupId   = process.env.GROUP_ID;
  const groupName = process.env.GROUP_NAME || groupId;
  if (!groupId) return;
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_id', ?)").run(groupId);
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES ('group_name', ?)").run(groupName);
  console.log(`✅ Grupo aplicado via env: ${groupName}`);
}

async function start() {
  console.log('🚀 Iniciando sistema de pendências...\n');

  initDB();
  applyEnvConfig(getDB());

  console.log('📱 Inicializando WhatsApp (aguarde o QR code)...');
  initWhatsApp(handleMessage).catch(err =>
    console.error('❌ Erro WhatsApp:', err.message)
  );

  initScheduler();

  const db = getDB();
  const ataConfig = db.prepare('SELECT * FROM ata_config WHERE id = 1').get();

  if (ataConfig && ataConfig.sheets_enabled) {
    console.log('📊 Inicializando integração Google Sheets...');
    const authenticated = await googleSheets.authenticate();

    if (authenticated) {
      // Usa ata_group_id do banco, ou fallback para GROUP_ID do ambiente
      let groupId = ataConfig.ata_group_id;
      if (!groupId || groupId === 'undefined') {
        groupId = process.env.GROUP_ID;
        console.log('⚠️  ata_group_id não configurado, usando GROUP_ID do ambiente');
      }

      if (groupId) {
        const ataNotifier = new AtaNotifier(getClient());
        ataNotifier.init(() => groupId);
        console.log('✅ Notificações da ata ativadas para grupo:', groupId);
      } else {
        console.log('⚠️  Google Sheets autenticado, mas nenhum grupo configurado');
      }
    }
  }

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
