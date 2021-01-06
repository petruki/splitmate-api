const { NotFoundError, BadRequest } = require('../exceptions');
const { Event } = require('../models/event');
const { UserInvite } = require('../models/user-invite'); 

async function getEvents(req, category) {
    let events;

    switch (category) {
        case 'current':
            events = await Event
                .find({ members: req.user._id, _id: { $nin: req.user.events_archived } });
            break;
        case 'archived':
            events = await Event
                .find({ _id: req.user.events_archived });
            break;
        case 'invited': {
            events = await Event
                .find({ _id: req.user.events_pending });

            const fromEmailInvitation = await UserInvite.find({ email: req.user.email });
            for (let i = 0; i < fromEmailInvitation.length; i++) {
                await fromEmailInvitation[i].populate({ 
                    path: 'v_event'
                }).execPopulate();
                events.push(fromEmailInvitation[i].v_event);
            }
            break;
        }
        default:
            throw new BadRequest('Event category not valid');
    }
    
    return events;
}

async function getEventById(eventId) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError('event');
    return event;
}

async function getEvent(where) {
    const event = await Event.findOne(where);
    if (!event) throw new NotFoundError('event');
    return event;
}

async function getEventsById(events) {
    return await Event.find({ _id: events });
}

module.exports = {
    getEvents,
    getEventById,
    getEventsById,
    getEvent
};