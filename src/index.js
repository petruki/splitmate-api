const { app } = require('./app');
const http = require('http');
const Pusher = require('./pusher');
const { logger } = require('./util');

const port = process.env.PORT;
const httpServer = http.createServer(app);

httpServer.listen(port, () => {
    new Pusher(httpServer).init();
    logger('index', `Server started on port ${port}`);
});