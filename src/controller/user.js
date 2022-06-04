const { User, Plan, Event, UserInvite } = require('../models');
const { NotFoundError, BadRequest } = require('../exceptions');
const { validateApiKey } = require('../middleware');
const { validate_token } = require('../external/google-recaptcha');
const { checkSignUp } = require('../external/switcher-api-facade');

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

async function getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('user');
    return user;
}

async function getUsersById(ids) {
    const users = await User.find({ _id: ids });
    if (!users || !users.length) throw new NotFoundError('user');
    return users;
}

async function getUser(where) {
    const user = await User.findOne(where);
    if (!user) throw new NotFoundError('user');
    return user;
}

async function getUserPlan(planId) {
    return await Plan.findById(planId);
}

async function createUser(req) {
    validateApiKey(req);
        
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
    await user.populate({ path: 'v_plan' });

    return { user, jwt };
}

async function signIn(req) {
    validateApiKey(req);
        
    const user = await User.findByCredentials(req.body.username, req.body.password);
    const jwt = await user.generateAuthToken();
    await user.populate({ path: 'v_plan' });

    return { user, jwt };
}

async function joinEvent(user, eventid) {
    await Plan.checkMaxEvents(user);

    const event = await Event.findOne({ _id: eventid });
    if (!event) {
        throw new NotFoundError('event');
    }

    if (event.members.includes(user._id)) {
        throw new BadRequest('User already joined');
    }

    const elementPos = user.events_pending.indexOf(eventid);
    if (elementPos >= 0) {
        user.events_pending.splice(user.events_pending.indexOf(eventid), 1);
        await user.save();
    } else {
        await UserInvite.deleteOne({ eventid, email: user.email });
    }

    event.members.push(user._id);
    await event.save();

    return user;
}

async function dismissEvent(user, eventid) {
    const elementPos = user.events_pending.indexOf(eventid);
    if (elementPos >= 0) {
        user.events_pending.splice(elementPos, 1);
        await user.save();
    }
    return user;
}

async function leaveEvent(user, eventid) {
    const event = await Event.findOne({ _id: eventid });
    if (!event) {
        throw new NotFoundError('event');
    }

    await removeUser(event, user);
    return user;
}

async function removeUserFromEvent(organizer, eventid, user) {
    const event = await Event.findOne({ _id: eventid, organizer });
    if (!event) {
        throw new NotFoundError('event');
    }

    const userToRemove = await User.findById(user);
    if (!userToRemove) {
        throw new NotFoundError('user');
    }

    await removeUser(event, userToRemove);
    return event;
}

module.exports = {
    getUserById,
    getUsersById,
    getUser,
    getUserPlan,
    createUser,
    signIn,
    joinEvent,
    dismissEvent,
    leaveEvent,
    removeUserFromEvent
};