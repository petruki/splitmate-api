const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, verifyInputUpdateParameters } = require('../middleware/index');
const { checkSignUp, checkSendMail } = require('../external/switcher-api-facade');
const { Event } = require('../models/event');
const { User } = require('../models/user');
const { UserInvite } = require('../models/user-invite');

const router = new express.Router();

router.post('/event/create', [
    check('name').isLength({ min: 2, max: 100 }),
    check('description').isLength({ max: 5000 }),
    check('location').isLength({ max: 500 }),
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
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            await checkSendMail();
            //TODO: Send email
            const userInvite = new UserInvite({ email: req.body.email, eventid: req.params.id });
            await userInvite.save();
        } else {
            if (user.events_pending.length && user.events_pending.includes(req.params.id)) {
                throw new Error('User already invited');
            }
    
            user.events_pending.push(req.params.id);
            await user.save();
        }

        res.send({ message: 'Invitation has been sent' });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.patch('/event/:id', auth, [
    check('name').isLength({ min: 2, max: 100 }),
    check('description').isLength({ max: 5000 }),
    check('location').isLength({ max: 500 }),
], verifyInputUpdateParameters(['name', 'description', 'date', 'location']
), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).send();
        }
        
        req.updates.forEach((update) => event[update] = req.body[update]);
        await event.save();
        res.send(event);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.delete('/event/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });

        if (!event) {
            return res.status(404).send();
        }

        await event.remove();
        res.send({ message: `Event '${event.name}' deleted` });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.get('/event', auth, async (req, res) => {
    try {
        let myEvent, invitedEvents;

        await Promise.all([
            Event.find({ organizer: req.user._id }), 
            Event.find({ members: req.user._id })
        ]).then(result => {
            myEvent = result[0];
            invitedEvents = result[1];
        });

        res.send({
            organizing: myEvent,
            joined: invitedEvents
        });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

module.exports = router;