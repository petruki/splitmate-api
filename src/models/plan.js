const mongoose = require('mongoose');
const { Event } = require('./event');

const PlanType = Object.freeze({
    FOUNDER: 'FOUNDER',
    MEMBER: 'MEMBER'
});

/**
 * Negative values = unlimited
 */
const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: Object.values(PlanType),
        unique: true,
        default: PlanType.MEMBER
    },
    enable_ads: {
        type: Boolean,
        default: true
    },
    enable_invite_email: {
        type: Boolean,
        default: false
    },
    max_events: {
        type: Number,
        default: 2
    },
    max_items: {
        type: Number,
        default: 10
    },
    max_poll_items: {
        type: Number,
        default: 5
    },
    max_members: {
        type: Number,
        default: 10
    }
});

planSchema.statics.setDefaultPlan = async function (user) {
    const plan = await Plan.findOne({ name: PlanType.MEMBER });
    user.plan = plan._id;
};

planSchema.statics.checkMaxEvents = async function(user) {
    const numEvents = await Event.find({ members: user._id }).countDocuments();
    return numEvents >= user.v_plan.max_events && user.v_plan.max_events != -1 ? 
        'Max number of Events has been reached' : undefined;
};

planSchema.statics.checkMaxItems = async function(user, event) {
    const numItems = event.items.length;
    return numItems >= user.v_plan.max_items && user.v_plan.max_items != -1 ?
        'Max number of Items has been reached' : undefined;
};

planSchema.statics.checkMaxPollItems = async function(user, item) {
    const numPollItems = item.poll.length;
    return numPollItems >= user.v_plan.max_poll_items && user.v_plan.max_poll_items != -1 ?
        'Max number of Poll Items has been reached' : undefined;
};

planSchema.statics.checkMaxMembers = async function(user, event, adding) {
    const numEventMembers = event.members.length + adding;
    return numEventMembers >= user.v_plan.max_members && user.v_plan.max_members != -1 ?
        'Max number of members has been reached' : undefined;
};

planSchema.statics.startDefaultPlans = function () {
    Plan.findOne({ name: PlanType.MEMBER }).then(data => {
        if (!data) {
            const defaultPlan = new Plan();
            defaultPlan.save();
        
            const founderPlan = new Plan({
                name: PlanType.FOUNDER,
                enable_ads: false,
                enable_invite_email: true,
                max_events: -1,
                max_items: -1,
                max_poll_items: -1,
                max_members: -1
            });
        
            founderPlan.save();
        }
    });
};

const Plan = mongoose.model('Plan', planSchema);

module.exports = {
    Plan,
    PlanType
};