const express = require('express');
const routes = require('./routes');
const { PORT } = require('./config');
const { startClient } = require('./whatsapp');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());
app.use(routes);

startClient();

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});

module.exports = app;