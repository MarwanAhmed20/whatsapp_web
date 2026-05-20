const express = require('express');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
app.use(express.json());

const PORT = 3000;

// ---------------- STATE ----------------
let isReady = false;
let queue = [];
let processing = false;
let reconnecting = false;
let started = false;

const MAX_QUEUE_SIZE = 200;
const MAX_RETRIES = 3;


const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------- CLIENT ----------------
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'main-session',
        dataPath: './sessions'
    }),

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-web-security'
        ]
    }
});

// ---------------- SAFE INIT ----------------
function startClient() {
    if (started) {
        console.log('⚠️ Client already started, skipping duplicate init');
        return;
    }

    started = true;
    console.log('🚀 Starting WhatsApp client...');
    client.initialize();
}

// ---------------- EVENTS ----------------
client.on('qr', (qr) => {
    console.log('❌ QR RECEIVED (session invalid or missing)');
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

client.on('auth_failure', async (msg) => {
    console.log('❌ AUTH FAILURE:', msg);

    isReady = false;

    try {
        await client.destroy();
        await sleep(5000);
        startClient();
    } catch (e) {
        console.log('Auth recovery failed:', e.message);
    }
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp READY EVENT FIRED');
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ LOADING: ${percent}% - ${message}`);
});

client.on('disconnected', async (reason) => {
    console.log('⚠️ Disconnected:', reason);

    isReady = false;

    if (reconnecting) return;
    reconnecting = true;

    try {
        await client.destroy();
        await sleep(5000);
        startClient();
    } catch (err) {
        console.log('Reconnect failed:', err.message);
    } finally {
        reconnecting = false;
    }
});

// ---------------- INIT ----------------
startClient();

// ---------------- RETRY WRAPPER ----------------
async function withRetry(fn) {
    let error;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (!isReady) throw new Error('CLIENT_NOT_READY');
            return await fn();
        } catch (e) {
            error = e;
            console.log(`Retry ${i + 1}/${MAX_RETRIES}:`, e.message);
            await sleep(1500);
        }
    }

    throw error;
}

// ---------------- EXECUTE ----------------
async function execute({ group, msg, file }) {

    if (!isReady) {
        return { success: false, error: 'WHATSAPP_NOT_READY' };
    }

    return await withRetry(async () => {
        // SEND FILE
        if (file) {
            if (!fs.existsSync(file)) {
                throw new Error('FILE_NOT_FOUND');
            }

            const media = MessageMedia.fromFilePath(file);

            await client.sendMessage(group, media, {
                caption: msg || ''
            });

            return { success: true, type: 'file' };
        }

        // SEND TEXT
        if (msg) {
            await client.sendMessage(group, msg);
            return { success: true, type: 'text' };
        }

        throw new Error('EMPTY_PAYLOAD');
    });
}
// ---------------- QUEUE ----------------
async function processQueue() {
    if (processing) return;

    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();

        try {
            const result = await execute(job);
            job.resolve(result);
        } catch (err) {
            job.resolve({ success: false, error: err.message });
        }

        await sleep(300);
    }

    processing = false;
}

// ---------------- API ----------------
app.post('/send', async (req, res) => {

    if (queue.length >= MAX_QUEUE_SIZE) {
        return res.json({
            success: false,
            error: 'QUEUE_FULL'
        });
    }

    if (!isReady) {
        return res.json({
            success: false,
            error: 'WHATSAPP_NOT_READY'
        });
    }

    const { group, number, msg, file } = req.body;
    let chatId = null;

    try {
        // Determine chat ID from group or number
        if (group) {
            // Use group/chat ID directly
            chatId = group;
        } else if (number) {
            // Convert phone number to WhatsApp ID
            const id = await client.getNumberId(number);

            if (!id) {
                return res.json({
                    success: false,
                    error: 'INVALID_NUMBER'
                });
            }

            chatId = id._serialized;
        } else {
            return res.json({
                success: false,
                error: 'GROUP_OR_NUMBER_REQUIRED'
            });
        }

        const promise = new Promise(resolve => {
            queue.push({ group: chatId, msg, file, resolve });
            processQueue();
        });

        const result = await promise;
        return res.json(result);
    } catch (err) {
        console.log('Error sending message:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

// ---------------- STATUS ----------------
app.get('/status', (req, res) => {
    res.json({
        ready: isReady,
        queueLength: queue.length,
        processing
    });
});

// ---------------- LIST GROUPS ----------------
app.get('/groups', async (req, res) => {
    if (!isReady) {
        return res.json({
            success: false,
            error: 'WHATSAPP_NOT_READY'
        });
    }

    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        const groupList = groups.map(group => ({
            id: group.id._serialized,
            name: group.name,
            participantCount: group.participants.length,
            isArchived: group.archived
        }));

        res.json({
            success: true,
            count: groupList.length,
            groups: groupList
        });
    } catch (err) {
        console.log('Error fetching groups:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

// ---------------- GET CONVERSATION ----------------
app.get('/conversation/:chatId', async (req, res) => {
    if (!isReady) {
        return res.json({
            success: false,
            error: 'WHATSAPP_NOT_READY'
        });
    }

    try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const chat = await client.getChatById(chatId);
        
        if (!chat) {
            return res.json({
                success: false,
                error: 'CHAT_NOT_FOUND'
            });
        }

        const messages = await chat.fetchMessages({ limit });

        const conversation = messages.map(msg => ({
            id: msg.id._serialized,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            timestamp: msg.timestamp * 1000, // Convert to milliseconds
            fromMe: msg.fromMe,
            hasMedia: msg.hasMedia,
            mediaType: msg.hasMedia ? msg.type : null,
            isGroupMsg: msg.isGroupMsg
        }));

        res.json({
            success: true,
            chatName: chat.name,
            isGroup: chat.isGroup,
            messageCount: conversation.length,
            messages: conversation
        });
    } catch (err) {
        console.log('Error fetching conversation:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

// ---------------- START API ----------------
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
