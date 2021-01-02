const express = require('express');
const { check } = require('express-validator');
const { auth, verifyInputUpdateParameters, validate } = require('../middleware');
const { checkSendMail } = require('../external/switcher-api-facade');
const { sendInvite, sendReminder } = require('../external/sendgrid');
const { Event, User, UserInvite, Item, Plan } = require('../models');
const { responseException, BadRequest, NotFoundError } = require('./common');

const router = new express.Router();

async function inviteMember(user, member, event, email) {
    // User does not exist
    if (!member && user.v_plan.enable_invite_email) { 
        // Verifies whether the feature is available or not
        await checkSendMail('invite');
        let userInvite = await UserInvite.findOne({ email: email, eventid: event._id });
        if (!userInvite) {
            userInvite = new UserInvite({ email: email, eventid: event._id });
            await userInvite.save();
            sendInvite(email, event.name);
        }
    } else {
        // User not a member yet
        if (!event.members.includes(member._id)) {
            // User has no pending requests
            if (!member.events_pending.length ||
                !member.events_pending.includes(event._id)) {
                member.events_pending.push(event._id);
                await member.save();
            }
        }
    }
}

router.post('/v1/create', [
    check('name', 'Name must have minimum of 2 and maximum of 100 characters').isLength({ min: 2, max: 100 }),
    check('description', 'Description must have maximum of 5000 characters').isLength({ max: 5000 }),
    check('location', 'Location must have maximum of 500 characters').isLength({ max: 500 })
], validate, auth, async (req, res) => {
    try {
        await Plan.checkMaxEvents(req.user);

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
});

router.post('/v1/invite_all/:id', [
    check('id', 'Invalid Event Id').isMongoId()
], validate, auth, async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);
        if (!event) {
            throw new NotFoundError('event');
        }

        await Plan.checkMaxMembers(req.user, event, req.body.emails.length);

        let member;
        for (let i = 0; i < req.body.emails.length; i++) {
            member = await User.findOne({ email: req.body.emails[i] });
            inviteMember(req.user, member, event, req.body.emails[i]);
        }
        
        res.send({ message: 'Invitation has been sent' });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.post('/v1/reminder/:id', [
    check('id', 'Invalid Event Id').isMongoId()
], validate, auth, async (req, res) => {
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
});

router.patch('/v1/transfer/:id/:organizer', [
    check('id', 'Invalid Event Id').isMongoId(),
    check('organizer', 'Invalid Member Id').isMongoId()
], validate, auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) {
            throw new NotFoundError('event');
        }

        const user = await User.findById(req.params.organizer);
        if (!user) {
            throw new NotFoundError('user');
        }

        await Plan.checkMaxEvents(user);
        event.organizer = user._id;
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/v1/:id', [
    check('name', 'Name must have minimum of 2 and maximum of 100 characters').isLength({ min: 2, max: 100 }),
    check('description', 'Description must have maximum of 5000 characters').isLength({ max: 5000 }),
    check('location', 'Location must have maximum of 500 characters').isLength({ max: 500 })
], verifyInputUpdateParameters(['name', 'description', 'date', 'location']
), validate, auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, members: req.user._id });

        if (!event) {
            throw new NotFoundError('event');
        }
        
        req.updates.forEach((update) => event[update] = req.body[update]);
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/v1/:id/:action/item', [check('id', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, members: req.user._id });

        if (!event) {
            throw new NotFoundError('event');
        }

        switch (req.params.action) {
            case 'add': {
                await Plan.checkMaxItems(req.user, event);

                const item = new Item(req.body);
                item.created_by = req.user._id;
                event.items.push(item);
                break;
            }
            case 'edit': {
                const itemToEdit = event.items.filter(item => String(item._id) === String(req.body._id));
                if (itemToEdit.length) {
                    await Plan.checkMaxPollItems(req.user, itemToEdit[0]);
                    
                    const updates = Object.keys(req.body);
                    updates.forEach((update) => itemToEdit[0][update] = req.body[update]);
                } else {
                    throw new NotFoundError('item');
                }
                break;
            }
            case 'pick': {
                const itemToPick = event.items.filter(item => String(item._id) === String(req.body._id));
                if (itemToPick.length) {
                    if (!itemToPick[0].assigned_to)
                        itemToPick[0].assigned_to = req.user._id;
                    else
                        throw new BadRequest('Item already picked. Refresh your Event.');
                } else {
                    throw new NotFoundError('item');
                }
                break;
            }
            case 'unpick': {
                const itemToUnPick = event.items.filter(item => String(item._id) === String(req.body._id));
                if (itemToUnPick.length) {
                    itemToUnPick[0].assigned_to = undefined;
                } else {
                    throw new NotFoundError('item');
                }
                break;
            }
            case 'delete': {
                const itemToDelete = event.items.filter(item => String(item._id) === String(req.body._id));
                if (itemToDelete.length) {
                    const elementPos = event.items.indexOf(itemToDelete[0]);
                    if (elementPos >= 0)
                        event.items.splice(elementPos, 1);
                } else {
                    throw new NotFoundError('item');
                }
                break;
            }
            default:
                throw new BadRequest(
                    `Invalid operation '${req.params.action}' - try [add, edit, pick, unpick, delete]`);
        }
        
        await event.save();
        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/v1/:id', [check('id', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {
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
});

router.get('/v1/my_events/:category', auth, async (req, res) => {
    try {
        let events;

        switch (req.params.category) {
            case 'current':
                events = await Event
                    .find({ members: req.user._id, _id: { $nin: req.user.events_archived } })
                    .select('-items -members');
                break;
            case 'archived':
                events = await Event
                    .find({ _id: req.user.events_archived })
                    .select('-items -members');
                break;
            case 'invited': {
                events = await Event
                    .find({ _id: req.user.events_pending })
                    .select('-items -members');

                const fromEmailInvitation = await UserInvite.find({ email: req.user.email });
                for (let i = 0; i < fromEmailInvitation.length; i++) {
                    await fromEmailInvitation[i].populate({ 
                        path: 'v_event',
                        select: '-items -members'
                    }).execPopulate();
                    events.push(fromEmailInvitation[i].v_event);
                }
                break;
            }
            default:
                throw new BadRequest('Event category not valid');
        }

        res.send(events);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/v1/:id', [check('id', 'Invalid Event Id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const event = 
            await Event
                .findById(req.params.id)
                .populate({
                    path: 'items',
                    model: 'Item',
                    populate: {
                        path: 'v_assigned_to',
                        model: 'User',
                        select: '-_id name username'
                    }})
                .populate({ path: 'v_members', select: 'name username email' })
                .populate({ path: 'v_organizer', select: 'name username email' }).lean();

        if (!event) {
            throw new NotFoundError('event');
        }

        res.send(event);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/v1/:eventid/item/:id', [
    check('eventid', 'Invalid Event Id').isMongoId(),
    check('id', 'Invalid Item Id').isMongoId()], 
    validate, auth, async (req, res) => {

    try {
        const event = 
            await Event
                .findById(req.params.eventid)
                .populate({
                    path: 'items',
                    model: 'Item',
                    populate: {
                        path: 'v_created_by',
                        model: 'User',
                        select: 'name username'
                    }
                })
                .populate({
                    path: 'items',
                    model: 'Item',
                    populate: {
                        path: 'v_assigned_to',
                        model: 'User',
                        select: 'name username'
                    }
                }).lean();

        if (!event) {
            throw new NotFoundError('event');
        }

        const item = event.items.filter(item => String(item._id) === String(req.params.id));
        if (!item.length) throw new NotFoundError('item');

        res.send(item[0]);
    } catch (e) {
        responseException(res, e, 500);
    }
});

module.exports = router;