const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

async function auth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id });

        if (!user) {
            throw new Error();
        }

        const isMatch = await bcrypt.compare(token.split('.')[2], user.token);
        if (!isMatch) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
}

module.exports = {
    auth
}