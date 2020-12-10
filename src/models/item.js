const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    details: [{
        type: {
            type: String
        },
        value: {
            type: String
        }
    }],
    poll_name: {
        type: String
    },
    poll: [{
        value: {
            type: String
        },
        votes: []
    }],
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

itemSchema.virtual('v_assigned_to', {
    ref: 'User',
    localField: 'assigned_to',
    foreignField: '_id',
    justOne : true
});

itemSchema.virtual('v_created_by', {
    ref: 'User',
    localField: 'created_by',
    foreignField: '_id',
    justOne : true
});

const Item = mongoose.model('Item', itemSchema);

module.exports = {
    itemSchema,
    Item
};