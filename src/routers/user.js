const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, validateApiKey } = require('../middleware');
const { Event, User, UserInvite, Plan } = require('../models');
const { checkSignUp } = require('../external/switcher-api-facade');
const { responseException, BadRequest, NotFoundError } = require('./common');
const { validate_token } = require('../external/google-recaptcha');

const router = new express.Router();

/**
 * Remove user from Event and unassign items
 */
async function removeUser(event, user) {
    let elementPos = event.members.indexOf(user._id);
    if (elementPos >= 0) {
        //Remove member from group
        event.members.splice(event.members.indexOf(user._id), 1);

        //Unpick items picked by member
        event.items.map(item => {
            if (String(item.assigned_to) === String(user._id)) {
                item.assigned_to = undefined;
            }
        });

        await event.save();

        //Remove event from archive if exists
        elementPos = user.events_archived.indexOf(event._id);
        if (elementPos >= 0) {
            user.events_archived.splice(elementPos, 1);
            await user.save();
        }
    }
}

router.post('/v1/signup', [
    check('name').isLength({ min: 2 }),
    check('username').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 3 }),
    check('plan').isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        //validate google captcha
        await validate_token(req);
        //validate switcher signup
        await checkSignUp(req.body.email);

        //create user
        const user = new User(req.body);
        //set plan
        await Plan.setDefaultPlan(user);
        //save and generate auth tken
        const jwt = await user.generateAuthToken();
        //return plan attributes
        await user.populate({ path: 'v_plan' }).execPopulate();

        res.status(201).send({ user, jwt });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/login', [
    check('username').isLength({ min: 3 }),
    check('password').isLength({ min: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        validateApiKey(req);
        
        const user = await User.findByCredentials(req.body.username, req.body.password);
        const jwt = await user.generateAuthToken();
        await user.populate({ path: 'v_plan' }).execPopulate();

        res.send({ user, jwt });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/join', [check('eventid', 'Invalid Event Id').isMongoId()],
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const maxEvents = await Plan.checkMaxEvents(req.user);
        if (maxEvents) {
            throw new BadRequest(maxEvents);
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
            req.user.events_pending.splice(req.user.events_pending.indexOf(req.query.eventid), 1);
            await req.user.save();
        } else {
            await UserInvite.deleteOne({ eventid: req.query.eventid, email: req.user.email });
        }

        event.members.push(req.user._id);
        await event.save();
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/dismiss', [check('eventid', 'Invalid Event Id').isMongoId()], 
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const elementPos = req.user.events_pending.indexOf(req.query.eventid);
        if (elementPos >= 0) {
            req.user.events_pending.splice(elementPos, 1);
            await req.user.save();
        }
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/leave', [check('eventid', 'Invalid Event Id').isMongoId()], 
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

        await removeUser(event, req.user);
        
        res.send(req.user);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/:user/remove', [
    check('eventid', 'Invalid Event Id').isMongoId(),
    check('user', 'Invalid User Id').isMongoId()], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findOne({ _id: req.query.eventid, organizer: req.user._id });
        if (!event) {
            throw new NotFoundError('event');
        }

        const user = await User.findById(req.params.user);
        if (!user) {
            throw new NotFoundError('user');
        }

        await removeUser(event, user);

        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/event/:action/archive', [check('eventid', 'Invalid Event Id').isMongoId()], 
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const elementPos = req.user.events_archived.indexOf(req.query.eventid);
        if (req.params.action === 'add') {
            if (elementPos < 0) {
                req.user.events_archived.push(req.query.eventid);
                await req.user.save();
            }
        } else if (req.params.action === 'remove') {
            if (elementPos >= 0) {
                req.user.events_archived.splice(elementPos, 1);
                await req.user.save();
            }
        } else {
            throw new BadRequest(`Command '${req.params.action}' does not exist - try [add, remove]`);
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

router.get('/v1/find', [check('username').isLength({ min: 2 })], auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

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