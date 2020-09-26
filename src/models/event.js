const mongoose = require('mongoose');
const item = require('./item');
const { itemSchema } = require('./item');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    type: {
        type: String,
        default: 'Other'
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
        ref: 'User',
        required: true
    },
    members: [{
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

eventSchema.pre('save', async function (next) {
    const event = this;
    let duplicated = 0;
    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

    if (findDuplicates(event.items.map(item => item.name)).length) {
        throw new Error('Duplicated items found');
    }

    next();
})

const Event = mongoose.model('Event', eventSchema);

module.exports = {
    Event
};