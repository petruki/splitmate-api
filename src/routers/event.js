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

router.post('/event/create', [
    check('name').isLength({ min: 2, max: 100 }),
    check('description').isLength({ max: 5000 }),
    check('location').isLength({ max: 500 }),
    check('organizer').isMongoId()
], auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const event = new Event(req.body);
        if (event.items.length)
            event.items.forEach(item => item.created_by = req.user._id);
        event.members.push(req.user._id);
        
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
            User.findOne({ email: req.body.email }), 
            Event.findById(req.params.id)
        ]).then(result => {
            user = result[0];
            event = result[1];
        });

        if (!event) {
            throw new NotFoundError('event');
        }

        if (!user) {
            await checkSendMail('invite');
            sendInvite(req.body.email, event.name);
            const userInvite = new UserInvite({ email: req.body.email, eventid: event._id });
            await userInvite.save();
        } else {
            if (!event.members.includes(user._id)) {
                if (user.events_pending.length && user.events_pending.includes(event._id)) {
                    throw new BadRequest('User already invited');
                }
            } else {
                throw new BadRequest('User already joined');
            }
    
            user.events_pending.push(event._id);
            await user.save();
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
    check('name').isLength({ min: 2, max: 100 }),
    check('description').isLength({ max: 5000 }),
    check('location').isLength({ max: 500 })
], verifyInputUpdateParameters(['name', 'description', 'date', 'location']
), async (req, res) => {
    try {
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

router.patch('/event/:id/:action/item', auth, async (req, res) => {
    try {
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
                        event.items.splice(event.items.indexOf(itemToDelete[0]), 1);
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

router.delete('/event/:id', auth, async (req, res) => {
    try {
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
        let organizer, member;

        await Promise.all([
            Event.find({ organizer: req.user._id }), 
            Event.find({ members: req.user._id })
        ]).then(result => {
            organizer = result[0];
            member = result[1];
        });

        res.send({
            organizer,
            member
        });
    } catch (e) {
        responseException(res, e, 500);
    }
})

module.exports = router;