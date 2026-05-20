
# WhatsApp Web API

A Node.js Express API to send messages and retrieve data from WhatsApp using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).

---

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Setup
```bash
# Clone/navigate to directory
cd whatsapp_web

# Install dependencies
npm install

# Install PM2 (optional, for production)
npm install -g pm2
```

---

## Running the API

### Option 1: Direct Node
```bash
node main_api_v2.js
```

### Option 2: PM2 (Recommended for Production)

**Start the API:**
```bash
pm2 start main_api_v2.js --name "whatsapp-api"
```

**View logs:**
```bash
pm2 logs whatsapp-api
pm2 logs whatsapp-api --lines 100  # Last 100 lines
```

**Monitor:**
```bash
pm2 monit
```

**Stop the API:**
```bash
pm2 stop whatsapp-api
```

**Restart the API:**
```bash
pm2 restart whatsapp-api
```

**Delete from PM2:**
```bash
pm2 delete whatsapp-api
```

**Auto-start on system reboot:**
```bash
pm2 startup
pm2 save
```

---

## Session Management

### Initial Setup (First Time)
When you first run the API, a QR code will appear in the terminal. Scan it with your WhatsApp phone to authenticate.

### Save Session Helper
If you want to generate or refresh the WhatsApp session manually, run:
```bash
node save_session.js
```

This script opens WhatsApp Web, shows the QR code in the terminal, and saves the session under `./sessions/` after authentication.

### Reset Session
If you need to re-authenticate or reset the session:
```bash
rm -rf ./sessions/
rm -rf ./.wwebjs_cache/
```

Then restart the API and scan the QR code again.

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

---

### 1. **Send Message** (POST)
Send a text message or file to a group, contact, or phone number.

**Endpoint:** `POST /send`

**Request Body (using group/chat ID):**
```json
{
  "group": "120363425130685977@g.us",
  "msg": "Hello group!",
  "file": "/path/to/file.pdf"
}
```

**Request Body (using phone number):**
```json
{
  "number": "201001234567",
  "msg": "Hello there!",
  "file": "/path/to/file.pdf"
}
```

**Parameters:**
- `group` *(optional)*: Chat ID (group or contact) - use this if you already have the chat ID
- `number` *(optional)*: Phone number - use this to send to a number directly (e.g., 201001234567)
- `msg` *(optional)*: Text message to send
- `file` *(optional)*: Path to file to send as media
- **Note:** Either `group` or `number` is required (provide one of them)

**Response:**
```json
{
  "success": true,
  "type": "text"
}
```

---

### 2. **Get Status** (GET)
Check the API and WhatsApp client status.

**Endpoint:** `GET /status`

**Response:**
```json
{
  "ready": true,
  "queueLength": 0,
  "processing": false
}
```

---

### 3. **List All Groups** (GET)
Retrieve all groups the authenticated user is a member of.

**Endpoint:** `GET /groups`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "groups": [
    {
      "id": "120363425130685977@g.us",
      "name": "Team Project",
      "participantCount": 12,
      "isArchived": false
    },
    {
      "id": "120363425130685978@g.us",
      "name": "Family Chat",
      "participantCount": 8,
      "isArchived": false
    }
  ]
}
```

---

### 4. **Get Conversation** (GET)
Retrieve message history from a chat (group or direct message).

**Endpoint:** `GET /conversation/:chatId?limit=50`

**Parameters:**
- `chatId` *(required)*: The chat ID (can be obtained from `/groups` endpoint)
- `limit` *(optional)*: Number of messages to fetch (default: 50, max recommended: 100)

**Example:**
```
GET /conversation/120363425130685977@g.us?limit=30
```

**Response:**
```json
{
  "success": true,
  "chatName": "Team Project",
  "isGroup": true,
  "messageCount": 30,
  "messages": [
    {
      "id": "false_120363425130685977@g.us_WAAAA...",
      "from": "201001234567@c.us",
      "to": "120363425130685977@g.us",
      "body": "Hello everyone",
      "timestamp": 1717689600000,
      "fromMe": false,
      "hasMedia": false,
      "mediaType": null,
      "isGroupMsg": true
    }
  ]
}
```

---

## Usage Examples

### cURL Examples

**1. Send Text Message to Group:**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "group": "120363425130685977@g.us",
    "msg": "Hello team!"
  }'
```

**2. Send File to Group:**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "group": "120363425130685977@g.us",
    "msg": "Here is the report",
    "file": "/home/user/report.pdf"
  }'
```

**3. Send Direct Message:**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "group": "201001234567@c.us",
    "msg": "Hi there!"
  }'
```

**4. Get API Status:**
```bash
curl http://localhost:3000/status
```

**5. List All Groups:**
```bash
curl http://localhost:3000/groups
```

**6. Get Last 50 Messages from a Group:**
```bash
curl "http://localhost:3000/conversation/120363425130685977@g.us?limit=50"
```

**7. Get Last 50 Messages from a user:**
```bash
curl "http://localhost:3000/conversation/20110123456@c.us?limit=50"
```

**8. Send Message to Phone Number (using /send):**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "201148661701",
    "msg": "Hello!"
  }'
```

**9. Send File to Phone Number (using /send):**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "201001234567",
    "msg": "Check this document",
    "file": "/home/user/document.pdf"
  }'
```

---


### Python Examples

**Send Message:**
```python
import requests

response = requests.post('http://localhost:3000/send', json={
    'group': '120363425130685977@g.us',
    'msg': 'Hello from Python!'
})
print(response.json())
```

**Get Groups:**
```python
response = requests.get('http://localhost:3000/groups')
print(response.json())
```

**Get Conversation:**
```python
chat_id = '120363425130685977@g.us'
response = requests.get(f'http://localhost:3000/conversation/{chat_id}?limit=50')
print(response.json())
```

**Send to Phone Number:**
```python
response = requests.post('http://localhost:3000/send', json={
    'number': '201001234567',
    'msg': 'Hello from Python!'
})
print(response.json())
```
```

---

## Finding Chat IDs

### For Groups:
1. Run `GET /groups` endpoint
2. Copy the `id` field from the desired group

### For Contacts:
1. Run `GET /groups` endpoint to see all chats
2. Or send a message first, then use the phone number format: `201001234567@c.us`
3. Or get from conversation messages (check the `from` or `to` field)

### Easier Way - Send to Number:
The `/send` endpoint now supports both `group` and `number` parameters! You can send directly to a phone number without needing to convert it to a chat ID:
```json
{
  "number": "201001234567",
  "msg": "Hello!"
}
```

---

## Troubleshooting

### "WHATSAPP_NOT_READY" Error
- WhatsApp is still initializing
- **Solution:** Wait 10-15 seconds after starting the API, or check if you need to scan the QR code

### "CHAT_NOT_FOUND" Error
- The chat ID doesn't exist or is invalid
- **Solution:** Verify the chat ID using `/groups` endpoint

### "INVALID_NUMBER" Error
- The phone number is not registered on WhatsApp or is in wrong format
- **Solution:** Ensure the number is a valid WhatsApp contact (e.g., 201001234567 without +, @, or formatting)

### "GROUP_OR_NUMBER_REQUIRED" Error
- Neither `group` nor `number` parameter was provided
- **Solution:** Include either the `group` (chat ID) or `number` (phone number) parameter in your request body

### "FILE_NOT_FOUND" Error
- The file path is incorrect
- **Solution:** Use absolute file paths

### Session/Authentication Issues
```bash
# Reset session and re-authenticate
rm -rf ./sessions/
rm -rf ./.wwebjs_cache/
node main_api_v2.js  # Scan QR code again
```

### Port Already in Use
If port 3000 is already in use:
```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Or change the PORT variable in main_api_v2.js
```

---

## File Structure

```
whatsapp_web/
├── main_api_v2.js          # Main API server (recommended)
├── main_api.js             # Alternative API (older version)
├── main.js                 # CLI version
├── package.json
├── readme.md               # This file
├── sessions/               # Session data (auto-created)
└── .wwebjs_cache/          # Cache (auto-created)
```

---

## API Response Format

All endpoints return JSON in the following format:

**Success:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": "ERROR_CODE_OR_MESSAGE"
}
```

---

## Notes

- Messages are queued internally to prevent rate limiting
- Maximum queue size: 200 messages
- Each message has a 3-second retry delay if it fails
- Sessions persist in `./sessions/` directory
- Keep API running with PM2 for reliability

---

## License

MIT