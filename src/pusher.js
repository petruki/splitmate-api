const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('./models/user');
const { logger } = require('./util');

class Pusher {
    constructor(httpServer) {
        this.io = new Server(httpServer);
        logger('pusher', 'Pusher initialized');
    }

    init() {
        this.io.use((socket, next) => this.auth(socket, next));
        this.io.on('connection', (socket) => {
            socket.on('NOTIFY_EVENT', (req) => this.onNotifyEvent(socket, req));
        });
    }

    async auth(socket, next) {
        try {
            const token = socket.handshake.query.auth;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ _id: decoded._id, token });
    
            if (!user) {
                logger('pusher', `User ${decoded._id} not found`);
                throw new Error();
            }
            
            socket.join(socket.handshake.query.channel);
            logger('pusher', `User ${user.username}:${socket.id} connected`);
            next();
        } catch (e) {
            next(new Error('Not authorized'));
        }
    }

    onNotifyEvent(socket, req) {
        const pusherObject = JSON.parse(req);
        socket.broadcast.to(pusherObject.channel).emit(pusherObject.action, req);
        logger('pusher', `Action ${pusherObject.action} on ${pusherObject.channel}`);
    }

}

module.exports = Pusher;