const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, verifyInputUpdateParameters } = require('../middleware/index');
const { checkSignUp, checkSendMail } = require('../external/switcher-api-facade');
const { sendInvite, sendReminder } = require('../external/sendgrid');
const { Event } = require('../models/event');
const { User } = require('../models/user');
const { UserInvite } = require('../models/user-invite');
const { Item } = require('../models/item'); 
const { responseException, BadRequest, NotFoundError, PermissionError } = require('./common/index');

const router = new express.Router();

async function inviteMember(user, event, email) {
    // User not registered to the API
    if (!user) { 
        await checkSendMail('invite');
        sendInvite(email, event.name);
        const userInvite = new UserInvite({ email: email, eventid: event._id });
        await userInvite.save();
    } else {
        // User already joined
        if (!event.members.includes(user._id)) {
            // User is pending to awnser
            if (user.events_pending.length && 
                user.events_pending.includes(event._id)) {
                throw new BadRequest('User already invited');
            }
        }

        user.events_pending.push(event._id);
        await user.save();
    }
}

router.post('/event/create', [
    check('name', 'Name must have minimum of 2 and maximum of 100 characters').isLength({ min: 2, max: 100 }),
    check('description', 'Description must have maximum of 5000 characters').isLength({ max: 5000 }),
    check('location', 'Location must have maximum of 500 characters').isLength({ max: 500 })
], auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const event = new Event(req.body);
        event.organizer = req.user._id;
        event.members.push(req.user._id);
        
        if (event.items.length)
            event.items.forEach(item => item.created_by = req.user._id);
        
        await event.save();
        res.status(201).send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/event/invite/:id', auth, async (req, res) => {
    try {
        let user, event;

        await Promise.all([
            User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] }),
            Event.findById(req.params.id)
        ]).then(result => {
            user = result[0];
            event = result[1];
        });

        if (!event) {
            throw new NotFoundError('event');
        }

        await inviteMember(user, event, req.body.email);

        res.send({ message: 'Invitation has been sent' });
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/event/invite_all/:id', auth, async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            throw new NotFoundError('event');
        }

        let user;
        for (let i = 0; i < req.body.emails.length; i++) {
            user = await User.findOne({ email: req.body.emails[i] });
            await inviteMember(user, event, req.body.emails[i]);
        }
        
        res.send({ message: 'Invitation has been sent' });
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.post('/event/reminder/:id', auth, async (req, res) => {
    try {
        await checkSendMail('reminder');
        const event = await Event.findById(req.params.id);

        if (!event) {
            throw new NotFoundError('event');
        }

        const pendingItems = event.items
            .filter(item => !item.assigned_to)
            .map(item => item.name);

        if (pendingItems.length) {
            await event.populate({ path: 'v_members' }).execPopulate();
            event.v_members.forEach(member => {
                sendReminder(member.email, event.name, pendingItems.join(', '));
            });
            res.send({ message: 'Reminder sent', items: pendingItems.join(', ') });
        } else {
            throw new BadRequest('There is no pending items for this event');
        }
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.patch('/event/:id', auth, [
    check('name', 'Name must have minimum of 2 and maximum of 100 characters').isLength({ min: 2, max: 100 }),
    check('description', 'Description must have maximum of 5000 characters').isLength({ max: 5000 }),
    check('location', 'Location must have maximum of 500 characters').isLength({ max: 500 })
], verifyInputUpdateParameters(['name', 'description', 'date', 'location']
), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            throw new NotFoundError('event');
        }
        
        req.updates.forEach((update) => event[update] = req.body[update]);
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.patch('/event/:id/:action/item', [check('id', 'Invalid Event Id').isMongoId()], 
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            throw new NotFoundError('event');
        }

        if (!req.body.name) {
            throw new BadRequest(`'name' must be specified`);
        }

        switch (req.params.action) {
            case 'add':
                const item = new Item(req.body);
                item.created_by = req.user._id;
                event.items.push(item);
                break;
            case 'pick':
                event.items.forEach(item => {
                    if (item.name === req.body.name)
                        item.assigned_to = req.user._id;
                });
                break;
            case 'unpick':
                event.items.forEach(item => {
                    if (item.name === req.body.name && 
                        String(item.assigned_to) === String(req.user._id))
                        item.assigned_to = undefined;
                });
                break;
            break;
            case 'delete':
                const itemToDelete = event.items.filter(item => item.name === req.body.name);
                if (itemToDelete.length) {
                    if (String(itemToDelete[0].created_by) === String(req.user._id)) {
                        const elementPos = event.items.indexOf(itemToDelete[0]);
                        if (elementPos >= 0)
                            event.items.splice(elementPos, 1);
                    } else {
                        throw new BadRequest('Unable to delete this item');
                    }
                }
                break;
            break;
            default:
                throw new BadRequest(
                    `Invalid operation '${req.params.action}' - try [add, pick, unpick, delete]`);
        }
        
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.delete('/event/:id', [check('id', 'Invalid Event Id').isMongoId()], 
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });

        if (!event) {
            throw new NotFoundError('event');
        }

        await event.remove();
        res.send({ message: `Event '${event.name}' deleted` });
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.get('/event', auth, async (req, res) => {
    try {
        let current_events, archived_events;

        await Promise.all([
            Event.find({ organizer: req.user._id, _id: { $nin: req.user.events_archived } }), 
            Event.find({ _id: req.user.events_archived })
        ]).then(result => {
            current_events = result[0];
            archived_events = result[1];
        });

        res.send({
            current_events,
            archived_events
        });
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.get('/event/:id', [check('id', 'Invalid Event Id').isMongoId()], 
    auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        
        const event = await Event.findById(req.params.id);

        if (!event) {
            throw new NotFoundError('event');
        }
        
        await event.populate({ path: 'v_members', select: '-_id name username email' }).execPopulate();
        await event.populate({ path: 'v_organizer', select: '-_id name username email' }).execPopulate();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
})

module.exports = router;