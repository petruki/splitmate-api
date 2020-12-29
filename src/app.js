const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { auth } = require('./middleware');
const userRouter = require('./routers/user');
const eventRouter = require('./routers/event');
const pollRouter = require('./routers/poll');
const { Plan } = require('./models/plan');
const { typeDefs, resolvers } = require('./graphql');

/**
 * Initialize MongoDB
 */
require('./db/mongoose');
if (process.env.ENV != 'test')
    Plan.startDefaultPlans();


const app = express();
const graphQLpath = '/graphql';
const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    context: async ({ req, res }) => ({ req, res }) 
});
app.use(graphQLpath, auth);
server.applyMiddleware({ app, graphQLpath });

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