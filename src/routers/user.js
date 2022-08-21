const express = require('express');
const { check } = require('express-validator');
const { auth, validate } = require('../middleware');
const { Event, User } = require('../models');
const { createUser, signIn, joinEvent, dismissEvent, leaveEvent, removeUserFromEvent } = require('../services/user');
const { responseException } = require('./common');
const { BadRequest, NotFoundError } = require('../exceptions');

const router = new express.Router();

router.post('/v1/signup', [
    check('name').isLength({ min: 2 }),
    check('username').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 3 }),
    check('plan').isEmpty()
], validate, async (req, res) => {
    try {
        const { user, jwt } = await createUser(req);
        res.status(201).send({ user, jwt });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/login', [
    check('username').isLength({ min: 3 }),
    check('password').isLength({ min: 3 })
], validate, async (req, res) => {
    try {
        const { user, jwt } = await signIn(req);
        res.send({ user, jwt });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/join', [check('eventid', 'Invalid Event Id').isMongoId()],
    validate, auth, async (req, res) => {
    try {
        const user = await joinEvent(req.user, req.query.eventid);
        res.send(user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/dismiss', [check('eventid', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const user = await dismissEvent(req.user, req.query.eventid); 
        res.send(user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/leave', [check('eventid', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const user = await leaveEvent(req.user, req.query.eventid);
        res.send(user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/:user/remove', [
    check('eventid', 'Invalid Event Id').isMongoId(),
    check('user', 'Invalid User Id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const event = await removeUserFromEvent(req.user._id, req.query.eventid, req.params.user); 
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/:action/archive', [check('eventid', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {

    try {
        const event = await Event.findOne({ _id: req.query.eventid, organizer: req.user._id });
        if (!event) {
            throw new NotFoundError('event');
        }

        const elementPos = req.user.events_archived.indexOf(event._id);
        switch(req.params.action) {
            case 'add':
                if (elementPos < 0) {
                    req.user.events_archived.push(event._id);
                    await req.user.save();
                }
                break;
            case 'remove':
                if (elementPos >= 0) {
                    req.user.events_archived.splice(elementPos, 1);
                    await req.user.save();
                }
                break;
            default:
                throw new BadRequest(
                    `Command '${req.params.action}' does not exist - try [add, remove]`);
        }
        
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/logout', auth, async (req, res) => {
    try {
        req.user.token = null;
        await req.user.save();
        res.send({ message: 'Success' });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/v1/me', auth, async (req, res) => {
    try {
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/v1/find', [check('username').isLength({ min: 2 })], 
    validate, auth, async (req, res) => {

    try {
        let user = await User
            .findOne({ username: req.query.username })
            .select('_id username name email')
            .lean();

        res.send(user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/v1/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send({ message: 'User removed' });
    } catch (e) {
        responseException(res, e, 500);
    }
});

module.exports = router;