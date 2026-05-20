const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
    console.log('📌 Scan this QR:\n');

    qrcode.generate(qr, {
        small: true
    });
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated!');
});

client.on('ready', async () => {
    console.log('✅ WhatsApp is ready!');
});

client.initialize();