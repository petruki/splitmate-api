const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/user');

const digestedServerApiKey = crypto.createHash('md5').update(process.env.API_SECRET).digest("hex").toUpperCase();

function validateApiKey(req) {
    if (process.env.ENV === 'prod') {
        const digestedApiKey = req.header('X-API-Key');
        if (digestedApiKey !== digestedServerApiKey) {
            throw new Error('Invalid API Key');
        }
    }
}

async function auth(req, res, next) {
    try {
        validateApiKey(req);

        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ _id: decoded._id, token });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
}

function verifyInputUpdateParameters(allowedUpdates) {
    return function (req, res, next) {
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).send({ error: `Invalid update parameters` });
        }

        req.updates = updates;
        next();
    }
}

module.exports = {
    auth,
    verifyInputUpdateParameters,
    validateApiKey
}