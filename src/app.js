const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const userRouter = require('./routers/user');
const eventRouter = require('./routers/event');
const pollRouter = require('./routers/poll');
const { Plan } = require('./models/plan');

/**
 * Initialize MongoDB
 */
require('./db/mongoose');
if (process.env.ENV != 'test')
    Plan.startDefaultPlans();

const app = express();

/**
 * API Settings
 */
app.use(express.json());
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

/**
 * API Routers
 */
app.use('/user', userRouter);
app.use('/event', eventRouter);
app.use('/poll', pollRouter);
app.get('/check', (req, res) => {
    res.status(200).send({ message: 'All good', code: 200 });
});

app.get('*', (req, res) => {
    res.status(404).send({ error: 'Operation not found' });
});

module.exports = {
    app
};