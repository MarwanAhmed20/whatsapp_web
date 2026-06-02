const path = require('path');

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const PORT = toNumber(process.env.PORT, 3000);
const MAX_QUEUE_SIZE = toNumber(process.env.MAX_QUEUE_SIZE, 200);
const MAX_RETRIES = toNumber(process.env.MAX_RETRIES, 3);
const QUEUE_DELAY_MS = toNumber(process.env.QUEUE_DELAY_MS, 300);
const RETRY_DELAY_MS = toNumber(process.env.RETRY_DELAY_MS, 1500);
const CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || 'main-session';
const DATA_PATH = process.env.WHATSAPP_DATA_PATH || path.join('.', 'sessions');
const HEADLESS = process.env.WHATSAPP_HEADLESS !== 'false';

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-zygote',
    '--single-process',
    '--disable-web-security'
];

module.exports = {
    PORT,
    MAX_QUEUE_SIZE,
    MAX_RETRIES,
    QUEUE_DELAY_MS,
    RETRY_DELAY_MS,
    CLIENT_ID,
    DATA_PATH,
    HEADLESS,
    PUPPETEER_ARGS
};