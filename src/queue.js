const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { client, getReady } = require('./whatsapp');
const {
    MAX_QUEUE_SIZE,
    MAX_RETRIES,
    QUEUE_DELAY_MS,
    RETRY_DELAY_MS
} = require('./config');

const queue = [];
let processing = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn) {
    let error;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            if (!getReady()) {
                throw new Error('CLIENT_NOT_READY');
            }

            return await fn();
        } catch (e) {
            error = e;
            console.log(`Retry ${attempt + 1}/${MAX_RETRIES}:`, e.message);
            await sleep(RETRY_DELAY_MS);
        }
    }

    throw error;
}

async function execute({ group, msg, file }) {
    if (!getReady()) {
        return { success: false, error: 'WHATSAPP_NOT_READY' };
    }

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

    if (msg) {
        await client.sendMessage(group, msg);
        return { success: true, type: 'text' };
    }

    throw new Error('EMPTY_PAYLOAD');
}

async function processQueue() {
    if (processing) {
        return;
    }

    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();

        try {
            const result = await withRetry(() => execute(job));
            job.resolve(result);
        } catch (err) {
            job.resolve({ success: false, error: err.message });
        }

        await sleep(QUEUE_DELAY_MS);
    }

    processing = false;
}

function enqueueJob(job) {
    return new Promise((resolve) => {
        queue.push({ ...job, resolve });
        processQueue();
    });
}

function isQueueFull() {
    return queue.length >= MAX_QUEUE_SIZE;
}

function getQueueLength() {
    return queue.length;
}

function isProcessing() {
    return processing;
}

function getStatus() {
    return {
        ready: getReady(),
        queueLength: getQueueLength(),
        processing: isProcessing()
    };
}

function getGroupsHandler() {
    return client.getChats().then((chats) => {
        const groups = chats.filter((chat) => chat.isGroup);

        const groupList = groups.map((group) => ({
            id: group.id._serialized,
            name: group.name,
            participantCount: group.participants.length,
            isArchived: group.archived
        }));

        return {
            success: true,
            count: groupList.length,
            groups: groupList
        };
    });
}

async function getConversationHandler(chatId, limit) {
    const chat = await client.getChatById(chatId);

    if (!chat) {
        return {
            success: false,
            error: 'CHAT_NOT_FOUND'
        };
    }

    const messages = await chat.fetchMessages({ limit });

    const conversation = messages.map((message) => ({
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp * 1000,
        fromMe: message.fromMe,
        hasMedia: message.hasMedia,
        mediaType: message.hasMedia ? message.type : null,
        isGroupMsg: message.isGroupMsg
    }));

    return {
        success: true,
        chatName: chat.name,
        isGroup: chat.isGroup,
        messageCount: conversation.length,
        messages: conversation
    };
}

async function sendMessagePayload(body) {
    if (isQueueFull()) {
        return {
            success: false,
            error: 'QUEUE_FULL'
        };
    }

    if (!getReady()) {
        return {
            success: false,
            error: 'WHATSAPP_NOT_READY'
        };
    }

    const { group, number, msg, file } = body;
    let chatId = null;

    if (group) {
        chatId = group;
    } else if (number) {
        const id = await client.getNumberId(number);

        if (!id) {
            return {
                success: false,
                error: 'INVALID_NUMBER'
            };
        }

        chatId = id._serialized;
    } else {
        return {
            success: false,
            error: 'GROUP_OR_NUMBER_REQUIRED'
        };
    }

    return enqueueJob({ group: chatId, msg, file });
}

module.exports = {
    enqueueJob,
    isQueueFull,
    getQueueLength,
    isProcessing,
    getStatus,
    getGroupsHandler,
    getConversationHandler,
    sendMessagePayload,
    execute,
    withRetry
};