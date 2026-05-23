const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

let client;
let qrCodeData = null;
let isReady = false;

function getClient()     { return client; }
function getQRCode()     { return qrCodeData; }
function isClientReady() { return isReady; }

async function initWhatsApp(messageHandler) {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.WWEBJS_AUTH_PATH || path.join(__dirname, '../../wwebjs_auth')
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
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
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

async function sendMessage(to, text) {
  if (!isReady || !client) throw new Error('WhatsApp não conectado');
  return client.sendMessage(to, text);
}

async function getGroups() {
  if (!isReady || !client) return [];
  const chats = await client.getChats();
  return chats
    .filter(c => c.isGroup)
    .map(c => ({ id: c.id._serialized, name: c.name, participants: c.participants?.length || 0 }));
}

module.exports = { initWhatsApp, sendMessage, getGroups, getClient, getQRCode, isClientReady };
