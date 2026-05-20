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

const MAX_RETRIES = 2;
const MAX_QUEUE_SIZE = 200;

// ---------------- CLIENT ----------------
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "main-session",
        dataPath: "./sessions"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('ready', () => {
    isReady = false;
});

client.on('disconnected', () => {
    isReady = false;

    // SAFE reconnect (no loop spam)
    if (!reconnecting) {
        reconnecting = true;

        setTimeout(() => {
            client.initialize();
            reconnecting = false;
        }, 5000);
    }
});

client.initialize();

// ---------------- HELPERS ----------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn) {
    let error;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await fn();
        } catch (e) {
            error = e;
            await sleep(1200);
        }
    }

    throw error;
}

// ---------------- SAFE WORKER ----------------
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

        await sleep(250); // throttle
    }

    processing = false;
}

// ---------------- EXECUTE ----------------
async function execute({ group, msg, file }) {

    if (!isReady || !client.info) {
        return { success: false, error: "WHATSAPP_NOT_READY" };
    }

    return await withRetry(async () => {

        if (file) {

            if (!fs.existsSync(file)) {
                throw new Error("FILE_NOT_FOUND");
            }

            const media = MessageMedia.fromFilePath(file);

            await client.sendMessage(group, media, {
                caption: msg || ''
            });

            return { success: true, type: "file" };
        }

        if (msg) {
            await client.sendMessage(group, msg);
            return { success: true, type: "text" };
        }

        throw new Error("EMPTY_PAYLOAD");
    });
}

// ---------------- API ----------------
app.post('/send', (req, res) => {

    if (queue.length >= MAX_QUEUE_SIZE) {
        return res.json({
            success: false,
            error: "QUEUE_FULL"
        });
    }

    const { group, msg, file } = req.body;

    if (!group) {
        return res.json({ success: false, error: "GROUP_REQUIRED" });
    }

    const promise = new Promise(resolve => {
        queue.push({ group, msg, file, resolve });
        processQueue();
    });

    promise.then(result => res.json(result));
});

// ---------------- STATUS ----------------
app.get('/status', (req, res) => {
    res.json({
        ready: isReady,
        queueLength: queue.length,
        processing,
        reconnecting
    });
});

// ---------------- START ----------------
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});