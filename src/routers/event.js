const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, verifyInputUpdateParameters } = require('../middleware/index');
const { Event } = require('../models/event');
const { User } = require('../models/user');

const router = new express.Router();

router.post('/event/create', [
    check('name').isLength({ min: 2 }),
    check('organizer').isMongoId()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const event = new Event(req.body);
        await event.save();

        res.status(201).send(event);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.post('/event/invite/:id', auth, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        if (!user) {
            return res.status(404).send({ error: `User ${req.body.username} not found` });
        }

        if (user.events_pending.include(req.param.id)) {
            throw new Error('User already invited');
        }

        user.events_pending.push(req.param.id);
        await user.save();
        res.send({ message: 'Invitation has been sent' });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.patch('/event/:id', auth, 
    verifyInputUpdateParameters(['name', 'description', 'date', 'location']
), async (req, res) => {
    req.updates.forEach((update) => req.admin[update] = req.body[update]);
    await req.admin.save();
    res.send(req.admin);
})

router.delete('/event/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.param.id, organizer: req.user._id });

        if (!event) {
            return res.status(404);
        }

        await event.remove();
        res.send({ message: `Event ${event.name} deleted` });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.get('/event', auth, async (req, res) => {
    try {
        let myEvent, invitedEvents;

        await Promise.all([
            Event.find({ organizer: req.user._id }), 
            Event.find({ member: req.user._id })
        ]).then(result => {
            myEvent = result[0];
            invitedEvents = result[1];
        });

        res.send({
            organizing: myEvent,
            member: invitedEvents
        });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

module.exports = router;