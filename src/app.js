const express = require('express');
const cors = require('cors');

/**
 * Initialize MongoDB and Switcher API context
 */
require('./db/mongoose');
require('./external/switcher-api-facade');

const app = express();

/**
 * API Settings
 */
app.use(express.json());
app.use(cors());

/**
 * API Routers
 */
app.get('/check', (req, res) => {
    res.status(200).send({ message: 'All good', code: 200 })
});

app.get('*', (req, res) => {
    res.status(404).send({ error: 'Operation not found' })
});

module.exports = {
    app
};