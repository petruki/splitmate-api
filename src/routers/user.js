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

router.post('/user/event/join', [check('eventid').isMongoId()],
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findOne({ _id: req.query.eventid });

        if (!event) {
            throw new NotFoundError('event');
        }

        if (event.members.includes(req.user._id)) {
            throw new BadRequest('User already joined');
        }

        const elementPos = req.user.events_pending.indexOf(req.query.eventid);

        if (elementPos >= 0) {
            event.members.push(req.user._id);
            req.user.events_pending.splice(req.user.events_pending.indexOf(req.query.eventid), 1);
    
            await event.save();
            await req.user.save();
        }
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/event/dismiss', auth, async (req, res) => {
    try {
        const elementPos = req.user.events_pending.indexOf(req.query.eventid);

        if (elementPos >= 0) {
            req.user.events_pending.splice(elementPos, 1);
            await req.user.save();
        }
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/event/leave', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.query.eventid });

        if (!event) {
            throw new NotFoundError('event');
        }

        const elementPos = event.members.indexOf(req.user._id);

        if (elementPos >= 0) {
            event.members.splice(event.members.indexOf(req.user._id), 1);
            await event.save();
        }
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/user/logout', auth, async (req, res) => {
    try {
        req.user.token = null;
        await req.user.save();
        res.send({ message: 'Success' });
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.get('/user/me', auth, async (req, res) => {
    try {
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }

})

router.get('/user/find', [check('username').isLength({ min: 2 })], 
    auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let users = await User
        .find({ username: req.query.username })
        .select('_id username name')
        .lean();

    res.send(users);
})

router.delete('/user/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send({ message: 'User removed' });
    } catch (e) {
        responseException(res, e, 500);
    }
})

module.exports = router;