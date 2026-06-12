/**
 * Script one-time para enviar correção no grupo
 * Uso: node enviar-correcao.js
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const GROUP_ID = process.env.GROUP_ID || '120363027764175016@g.us';

const mensagem = `✅ *CORREÇÃO*

A tarefa do *IVAN LUCAS* sobre confirmação de topografia (Montes Claros) já foi concluída.

Desconsiderar cobrança da última mensagem.

Correção aplicada no sistema! 🔧`;

async function enviarCorrecao() {
  console.log('🤖 Iniciando bot para enviar correção...');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.WWEBJS_AUTH_PATH || './wwebjs_auth'
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
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('❌ QR Code necessário! Bot já está autenticado no servidor?');
    console.log('Se estiver rodando local, escaneie o QR:');
    console.log(qr);
  });

  client.on('ready', async () => {
    console.log('✅ Bot conectado!');
    console.log(`📤 Enviando correção para grupo: ${GROUP_ID}`);

    try {
      await client.sendMessage(GROUP_ID, mensagem);
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('\n' + mensagem);

      setTimeout(() => {
        console.log('\n🔚 Finalizando...');
        process.exit(0);
      }, 3000);

    } catch (error) {
      console.error('❌ Erro ao enviar:', error.message);
      process.exit(1);
    }
  });

  client.on('auth_failure', () => {
    console.error('❌ Falha na autenticação!');
    process.exit(1);
  });

  client.initialize();
}

enviarCorrecao();
