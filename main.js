const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const MAX_RETRIES = 3;

// ---------------- CLI ARGS ----------------
const args = process.argv.slice(2);

const getArg = (key) => {
    const found = args.find(a => a.startsWith(`--${key}=`));
    return found ? found.split('=').slice(1).join('=') : null;
};

const to = getArg('to');
const group = getArg('group');
const msg = getArg('msg');
const file = getArg('file');

// ---------------- JSON OUTPUT ----------------
function output(status, attempts, message) {
    console.log(JSON.stringify({
        status,
        attempts,
        message
    }));
}

// ---------------- CLIENT ----------------
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

// ---------------- HELPERS ----------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, retries = MAX_RETRIES) {
    let lastError;

    for (let i = 1; i <= retries; i++) {
        try {
            await fn();
            return { success: true, attempts: i };
        } catch (err) {
            lastError = err;
            await sleep(3000);
        }
    }

    return { success: false, attempts: retries, error: lastError };
}

// ---------------- EVENTS ----------------
client.on('auth_failure', msg => {
    output(false, 0, `Auth failure: ${msg}`);
});

client.on('disconnected', reason => {
    output(false, 0, `Disconnected: ${reason}`);
});

// ---------------- MAIN ----------------
client.on('ready', async () => {

    try {

        await sleep(1000);

        let chatId = null;

        if (group) {
            chatId = group;

        } else if (to) {
            const id = await client.getNumberId(to);

            if (!id) {
                return output(false, 0, 'Number not found on WhatsApp');
            }

            chatId = id._serialized;

        } else {
            return output(false, 0, 'No target provided');
        }

        await client.sendPresenceAvailable();
        await sleep(2000);

        // ---------------- SEND LOGIC ----------------
        const result = await withRetry(async () => {

            if (file) {

                const media = MessageMedia.fromFilePath(file);

                await client.sendMessage(chatId, media, {
                    caption: msg || ''
                });

            } else if (msg) {

                await client.sendMessage(chatId, msg);

            } else {
                throw new Error("Nothing to send");
            }

        });

        // ---------------- OUTPUT ----------------
        if (result.success) {
            output(true, result.attempts, 'Message sent successfully');
        } else {
            output(false, result.attempts, result.error?.message);
        }

    } catch (err) {
        output(false, MAX_RETRIES, err.message);
    }

    finally {
        setTimeout(async () => {
            try {
                await client.destroy();
            } catch (_) {}
            process.exit();
        }, 3000);
    }

});

// ---------------- START ----------------
client.initialize();