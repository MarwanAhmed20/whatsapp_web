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


    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('checking groups...');
    const chats = await client.getChats();
    console.log('checking groups...');
    const limitedChats = chats.slice(0, 20);
    const groups = chats.filter(chat => chat.isGroup);
    console.log("Groups count:", groups.length);

    limitedChats.forEach(chat => {
        if (chat.isGroup) {
            console.log(chat.name, chat.id._serialized);
        }
    });

});

client.initialize();