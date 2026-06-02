# WhatsApp Web API

A Node.js Express API for sending messages and reading chats through [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).

## Project Structure

```text
whatsapp_web/
├── src/
│   ├── config.js
│   ├── whatsapp.js
│   ├── queue.js
│   ├── routes.js
│   └── app.js
├── package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 14+
- npm

### Install

```bash
cd whatsapp_web
npm install
```

## Configuration

The app uses environment variables with safe defaults:

- `PORT` defaults to `3000`
- `MAX_QUEUE_SIZE` defaults to `200`
- `MAX_RETRIES` defaults to `3`
- `QUEUE_DELAY_MS` defaults to `300`
- `RETRY_DELAY_MS` defaults to `1500`
- `WHATSAPP_CLIENT_ID` defaults to `main-session`
- `WHATSAPP_DATA_PATH` defaults to `./sessions`
- `WHATSAPP_HEADLESS` defaults to `true`

Example:

```bash
PORT=3000 MAX_QUEUE_SIZE=200 npm start
```

## Run

### Direct Node

```bash
node src/app.js
```

### PM2

```bash
pm2 start src/app.js --name whatsapp-api
pm2 logs whatsapp-api
```

## Session Login

On first start, scan the QR code shown in the terminal to authenticate WhatsApp Web.

If you need to refresh the saved session:

```bash
node save_session.js
```

If authentication breaks, remove the session cache and start again:

```bash
rm -rf ./sessions/
rm -rf ./.wwebjs_cache/
```

## API Endpoints

Base URL: `http://localhost:3000`

### `POST /send`

Send a message or file to a group or phone number.

```json
{
  "group": "120363425130685977@g.us",
  "msg": "Hello group!",
  "file": "/path/to/file.pdf"
}
```

Or:

```json
{
  "number": "201001234567",
  "msg": "Hello there!"
}
```

### `GET /status`

Returns WhatsApp readiness and queue state.

```json
{
  "ready": true,
  "queueLength": 0,
  "processing": false
}
```

### `GET /groups`

Lists WhatsApp groups for the authenticated account.

### `GET /conversation/:chatId?limit=50`

Returns recent messages for a chat.

Example:

```bash
curl "http://localhost:3000/conversation/120363425130685977@g.us?limit=50"
```

## Common Errors

- `WHATSAPP_NOT_READY`: the client is still initializing or disconnected
- `QUEUE_FULL`: the in-memory queue reached `MAX_QUEUE_SIZE`
- `INVALID_NUMBER`: the provided phone number is not a valid WhatsApp account
- `GROUP_OR_NUMBER_REQUIRED`: request body is missing both `group` and `number`
- `FILE_NOT_FOUND`: the file path does not exist

## Notes

- The queue, retry wrapper, and client event handling remain in-memory and unchanged in behavior.
- Console logs are intentionally kept so startup, auth, reconnect, and queue flow remain visible.