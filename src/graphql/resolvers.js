const { getEvents, getEventsById } = require('../services/event');
const { getUserById, getUsersById, getUserPlan } = require('../services/user');

const resolvers = {
    Query: { 
        events(_parent, args, context) {
            return getEvents(context.req, args.category);
        },
        me(_parent, _args, context) {
            return context.req.user;
        }
    },
    Event: {
        v_organizer(parent) {
            return resolveUser(parent.organizer);
        },
        v_members(parent) {
            return resolveUsers(parent.organizer);
        }
    },
    Item: {
        v_assigned_to(parent) {
            return resolveUser(parent.assigned_to);
        },
        v_created_by(parent) {
            return resolveUser(parent.created_by);
        }
    },
    User: {
        v_events_pending(parent) {
            return resolveEvents(parent.events_pending);
        },
        v_events_archived(parent) {
            return resolveEvents(parent.events_archived);
        },
        v_plan(parent) {
            return resolvePlan(parent.plan);
        }
    },
    UserInvite: {
        v_event(parent) {
            return resolveEvent(parent.eventid);
        }
    }
};

async function resolveUser(organizerId) {
    return await getUserById(organizerId);
}

async function resolveUsers(members) {
    return await getUsersById(members);
}

async function resolveEvents(events) {
    return await getEventsById(events);
}

async function resolveEvent(eventId) {
    return await getEventsById(eventId);
}

async function resolvePlan(planId) {
    return await getUserPlan(planId);
}

module.exports = resolvers;