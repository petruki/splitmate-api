const mongoose = require('mongoose');
const item = require('./item');
const { Item, itemSchema } = require('./item');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    date: {
        type: Date
    },
    location: {
        type: String,
        trim: true
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pending_members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    items: [itemSchema]
});

eventSchema.virtual('v_members', {
    ref: 'User',
    localField: 'members',
    foreignField: '_id'
});

eventSchema.virtual('v_pending_members', {
    ref: 'User',
    localField: 'pending_members',
    foreignField: '_id'
});

const Event = mongoose.model('Event', eventSchema);

module.exports = {
    Event
};