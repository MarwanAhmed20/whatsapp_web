const express = require('express');
const {
    getStatus,
    getGroupsHandler,
    getConversationHandler,
    sendMessagePayload
} = require('./queue');

const router = express.Router();

router.post('/send', async (req, res) => {
    try {
        const result = await sendMessagePayload(req.body);
        return res.json(result);
    } catch (err) {
        console.log('Error sending message:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

router.get('/status', (req, res) => {
    res.json(getStatus());
});

router.get('/groups', async (req, res) => {
    if (!getStatus().ready) {
        return res.json({
            success: false,
            error: 'WHATSAPP_NOT_READY'
        });
    }

    try {
        const result = await getGroupsHandler();
        res.json(result);
    } catch (err) {
        console.log('Error fetching groups:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

router.get('/conversation/:chatId', async (req, res) => {
    if (!getStatus().ready) {
        return res.json({
            success: false,
            error: 'WHATSAPP_NOT_READY'
        });
    }

    try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit, 10) || 50;
        const result = await getConversationHandler(chatId, limit);
        res.json(result);
    } catch (err) {
        console.log('Error fetching conversation:', err.message);
        res.json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;