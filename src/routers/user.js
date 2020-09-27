const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/index');
const { User } = require('../models/user');
const { Event } = require('../models/event');
const { checkSignUp } = require('../external/switcher-api-facade');
const { responseException, BadRequest, NotFoundError } = require('./common/index');

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
        responseException(res, e, 500);
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
        responseException(res, e, 500);
    }
})

router.post('/user/event/join', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.body.eventid });

        if (!event) {
            throw new NotFoundError('event');
        }

        if (event.members.includes(req.user._id)) {
            throw new BadRequest('User already joined');
        }

        event.members.push(req.user._id);
        req.user.events_pending.splice(req.user.events_pending.indexOf(req.body.eventid), 1);

        await event.save();
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/event/dismiss', auth, async (req, res) => {
    try {
        req.user.events_pending.splice(req.user.events_pending.indexOf(req.body.eventid), 1);
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/event/leave', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.body.eventid });

        if (!event) {
            throw new NotFoundError('event');
        }

        event.members.splice(event.members.indexOf(req.user._id), 1);
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/logout', auth, async (req, res) => {
    req.user.token = null;
    await req.user.save();
    res.send({ message: 'Success' });
})

router.get('/user/me', auth, async (req, res) => {
    res.send(req.user);
})

router.get('/user/find', auth, async (req, res) => {
    let users = [];
    if (req.query.username.length && req.query.username.length > 2) {
        const foundUsers = await User.find({ username: req.query.username });
        users.push(foundUsers.map(u => {
            return {
                id: u._id,
                username: u.username
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