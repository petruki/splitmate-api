const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/index');
const { User } = require('../models/user');
const { Event } = require('../models/event');
const { checkSignUp } = require('../external/switcher-api-facade');
const user = require('../models/user');

const router = new express.Router();

router.post('/user/signup', [
    check('name').isLength({ min: 2 }),
    check('username').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        await checkSignUp(req.body.email);
        const user = new User(req.body);
        const jwt = await user.generateAuthToken();

        res.status(201).send({ user, jwt });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.post('/user/login', [
    check('username').isLength({ min: 3 }),
    check('password').isLength({ min: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const user = await User.findByCredentials(req.body.username, req.body.password);
        const jwt = await user.generateAuthToken();
        res.send({ user, jwt });
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' });
    }
})

router.post('/user/event/join', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.body.eventid, members: req.user._id });

        if (!event) {
            throw new Error('Event does not exist or member already joined');
        }

        event.members.push(req.user._id);
        req.user.events_pending.splice(req.user.events_pending.indexOf(req.body.eventid), 1);

        await event.save();
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.post('/user/event/dismiss', auth, async (req, res) => {
    try {
        req.user.events_pending.splice(req.user.events_pending.indexOf(req.body.eventid), 1);
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.post('/user/logout', auth, async (req, res) => {
    req.user.token = null;
    await req.user.save();
    res.send();
})

router.get('/user/me', auth, async (req, res) => {
    res.send(req.user);
})

router.get('/user/find', auth, async (req, res) => {
    let users = [];
    if (req.query.username && req.query.username.lenght > 2) {
        const foundUsers = await User.find({ username: req.query.username });
        users.push(foundUsers.map(u => {
            return {
                id: u._id,
                username: username
            }
        }));
    }
    res.send(users);
})

router.delete('/user/me', auth, async (req, res) => {
    await req.user.remove();
    res.send({ message: 'User removed' });
})

module.exports = router;