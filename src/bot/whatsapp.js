const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function findChromium() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env && fs.existsSync(env)) return env;

  const candidates = [
    '/root/.nix-profile/bin/chromium',
    '/nix/var/nix/profiles/default/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  for (const name of ['chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const p = execSync(`which ${name} 2>/dev/null`, { timeout: 3000 }).toString().trim();
      if (p && fs.existsSync(p)) return p;
    } catch {}
  }

  return undefined;
}

let client;
let qrCodeData = null;
let isReady = false;

function getClient()     { return client; }
function getQRCode()     { return qrCodeData; }
function isClientReady() { return isReady; }

async function initWhatsApp(messageHandler) {
  const chromiumPath = findChromium();
  console.log(`🌐 Chromium: ${chromiumPath || 'auto-detect pelo puppeteer'}`);

  // Garantir que o diretório de autenticação existe
  // No Railway, sempre usar /app/data/wwebjs_auth
  const authPath = process.env.RAILWAY_ENVIRONMENT
    ? '/app/data/wwebjs_auth'
    : (process.env.WWEBJS_AUTH_PATH || path.join(__dirname, '../../wwebjs_auth'));

  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
    console.log(`📁 Diretório de autenticação criado: ${authPath}`);
  } else {
    console.log(`📁 Usando diretório de autenticação: ${authPath}`);

    // Limpar locks do Chromium em todos os locais possíveis
    try {
      const possiblePaths = [
        authPath,
        path.join(authPath, 'session'),
        path.join(authPath, 'session-default')
      ];

      const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

      possiblePaths.forEach(dir => {
        if (fs.existsSync(dir)) {
          lockFiles.forEach(file => {
            const lockPath = path.join(dir, file);
            if (fs.existsSync(lockPath)) {
              fs.unlinkSync(lockPath);
              console.log(`🔓 Lock removido: ${lockPath}`);
            }
          });
        }
      });

      // Listar conteúdo do authPath para debug
      if (fs.existsSync(authPath)) {
        const files = fs.readdirSync(authPath);
        console.log(`📂 Conteúdo de ${authPath}:`, files.slice(0, 10));
      }
    } catch (err) {
      console.log('⚠️  Erro ao remover locks:', err.message);
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--disable-features=TranslateUI',
        '--disable-blink-features=AutomationControlled',
        '--single-process',  // Força processo único (evita locks)
        '--no-default-browser-check',
        '--disable-site-isolation-trials'
      ],
      executablePath: chromiumPath
    }
  });

  client.on('qr', async (qr) => {
    console.log('📱 QR Code gerado! Acesse /api/qr no dashboard para escanear.');
    qrCodeData = await qrcode.toDataURL(qr);
    isReady = false;
  });

  client.on('ready', () => {
    isReady = true;
    qrCodeData = null;
    console.log('✅ WhatsApp conectado!');
  });

  client.on('authenticated', () => {
    console.log('🔐 Sessão autenticada.');
  });

  client.on('auth_failure', () => {
    isReady = false;
    console.error('❌ Falha na autenticação do WhatsApp.');
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    console.log('🔌 WhatsApp desconectado:', reason);
  });

  if (messageHandler) {
    client.on('message', messageHandler);
  }

  await client.initialize();
  return client;
}

async function sendMessage(to, text, mentions = []) {
  if (!isReady || !client) throw new Error('WhatsApp não conectado');
  return client.sendMessage(to, text, { mentions });
}

async function getGroups() {
  if (!isReady || !client) return [];
  const chats = await client.getChats();
  return chats
    .filter(c => c.isGroup)
    .map(c => ({ id: c.id._serialized, name: c.name, participants: c.participants?.length || 0 }));
}

module.exports = { initWhatsApp, sendMessage, getGroups, getClient, getQRCode, isClientReady };
