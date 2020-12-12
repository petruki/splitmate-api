const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('./models/user');

class Pusher {
    constructor(server) {
        this.io = socketio(server);
        this.init(); 
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
                throw new Error();
            }
            
            socket.join(socket.handshake.query.channel);
            next();
        } catch (e) {
            next(new Error('Not authorized'));
        }
    }

    onNotifyEvent(socket, req) {
        const pusherObject = JSON.parse(req);
        socket.broadcast.to(pusherObject.channel).emit(pusherObject.action, req);
    }

}

module.exports = Pusher;