const { Client, LocalAuth } = require('whatsapp-web.js');
const {
    CLIENT_ID,
    DATA_PATH,
    HEADLESS,
    PUPPETEER_ARGS
} = require('./config');

let isReady = false;
let started = false;
let reconnecting = false;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: CLIENT_ID,
        dataPath: DATA_PATH
    }),
    puppeteer: {
        headless: HEADLESS,
        args: PUPPETEER_ARGS
    }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setReady(value) {
    isReady = Boolean(value);
}

function getReady() {
    return isReady;
}

function startClient() {
    if (started) {
        console.log('⚠️ Client already started, skipping duplicate init');
        return;
    }

    started = true;
    console.log('🚀 Starting WhatsApp client...');
    client.initialize();
}

async function restartClient() {
    started = false;
    await sleep(5000);
    startClient();
}

client.on('qr', () => {
    console.log('❌ QR RECEIVED (session invalid or missing)');
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

client.on('auth_failure', async (msg) => {
    console.log('❌ AUTH FAILURE:', msg);

    setReady(false);

    try {
        await client.destroy();
        await restartClient();
    } catch (e) {
        console.log('Auth recovery failed:', e.message);
    }
});

client.on('ready', () => {
    setReady(true);
    console.log('✅ WhatsApp READY EVENT FIRED');
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ LOADING: ${percent}% - ${message}`);
});

client.on('disconnected', async (reason) => {
    console.log('⚠️ Disconnected:', reason);

    setReady(false);

    if (reconnecting) {
        return;
    }

    reconnecting = true;

    try {
        await client.destroy();
        await restartClient();
    } catch (err) {
        console.log('Reconnect failed:', err.message);
    } finally {
        reconnecting = false;
    }
});

module.exports = {
    client,
    startClient,
    setReady,
    getReady
};