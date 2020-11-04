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
    items: [itemSchema],
    version: {
        type: String
    }
});

eventSchema.virtual('v_members', {
    ref: 'User',
    localField: 'members',
    foreignField: '_id'
});

eventSchema.virtual('v_organizer', {
    ref: 'User',
    localField: 'organizer',
    foreignField: '_id',
    justOne : true
});

eventSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret) {
        delete ret.id;
        
        if (ret.v_members) {
            ret.v_members.forEach(member => delete member.id)
        }

        if (ret.v_organizer) {
            ret.v_organizer.forEach(organizer => delete organizer.id)
        }
        
        return ret;
    }
};

eventSchema.pre('save', async function (next) {
    const event = this;
    let duplicated = 0;
    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

    if (findDuplicates(event.items.map(item => item.name)).length) {
        throw new Error('Duplicated items found');
    }

    event.version = Date.now().toString();
    next();
})

const Event = mongoose.model('Event', eventSchema);

module.exports = {
    Event
};