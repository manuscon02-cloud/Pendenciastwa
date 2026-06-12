const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Endpoint de emergência para resetar WhatsApp
 * Limpa sessão corrompida e força reinicialização
 */
async function forceWhatsAppReset(req, res) {
  try {
    console.log('🔄 RESET FORÇADO DO WHATSAPP iniciado...');

    // 1. Identifica pasta de autenticação
    const authPath = process.env.RAILWAY_ENVIRONMENT
      ? '/app/data/wwebjs_auth'
      : (process.env.WWEBJS_AUTH_PATH || path.join(__dirname, '../../wwebjs_auth'));

    console.log(`📁 Pasta de autenticação: ${authPath}`);

    // 2. Remove pasta de sessão (força novo QR)
    if (fs.existsSync(authPath)) {
      console.log('🗑️  Removendo sessão antiga...');
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('✅ Sessão removida');
    } else {
      console.log('ℹ️  Pasta não existe, nada pra remover');
    }

    // 3. Mata processos Chromium travados (Linux/Railway)
    if (process.platform === 'linux') {
      console.log('🔫 Matando processos Chromium...');
      exec('pkill -9 chromium || true', (err) => {
        if (err) console.log('⚠️  Nenhum processo chromium encontrado');
        else console.log('✅ Processos chromium finalizados');
      });
    }

    // 4. Responde sucesso
    res.json({
      success: true,
      message: 'WhatsApp resetado! Aguarde 30 segundos e acesse /api/qr para escanear novo QR code.',
      steps: [
        'Sessão antiga removida',
        'Processos chromium finalizados',
        'Aguardando reinicialização automática...'
      ]
    });

    // 5. Força exit do processo após responder (Railway reinicia automaticamente)
    console.log('🔄 Finalizando processo em 2 segundos...');
    setTimeout(() => {
      console.log('💀 Exit forçado - Railway vai reiniciar automaticamente');
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Erro no reset:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = { forceWhatsAppReset };
