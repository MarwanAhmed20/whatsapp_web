const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('🚀 Starting...');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "main-session",
        dataPath: "./sessions"
    }),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox']
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('⌛ Loading:', percent, message);
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated!');
});

client.on('ready', async () => {
    console.log('✅ WhatsApp is ready!');

    await new Promise(r => setTimeout(r, 7000));

    //const number = '201008206852';
    const groupId = '120363425130685977@g.us';

    console.log('📌 Resolving group ID:', groupId);
    const groupChat = await client.getChatById(groupId);

    if (!groupChat) {
        console.log('❌ Group not found');
        return;
    }

    console.log('📌 Resolved group name:', groupChat.name);
    
    const sent = await groupChat.sendMessage('Hello group from bot 🚀');
    // const id = await client.getNumberId(number);

    // if (!id) {
    //     console.log('❌ Number not on WhatsApp');
    //     return;
    

    // console.log('📌 Resolved ID:', id._serialized);

    // const sent = await client.sendMessage(id._serialized, 'Hello from bot 🚀');

    console.log('✅ Message sent!', sent.id.id);
});

client.on('auth_failure', msg => {
    console.log('❌ Auth failure:', msg);
});

client.on('disconnected', reason => {
    console.log('⚠️ Disconnected:', reason);
});

client.initialize();