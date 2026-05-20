const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 Starting session login...');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "main-session",
        dataPath: "./sessions"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

client.on('qr', qr => {
    console.log('📌 Scan QR:\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated!');
});

client.on('ready', () => {
    console.log('✅ Session saved & WhatsApp ready!');
});

client.initialize();