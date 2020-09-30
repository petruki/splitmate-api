const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String
    },
    value: {
        type: Number
    },
    individual: {
        type: Boolean,
        default: false
    },
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
    foreignField: '_id'
});

itemSchema.virtual('v_created_by', {
    ref: 'User',
    localField: 'created_by',
    foreignField: '_id'
});

const Item = mongoose.model('Item', itemSchema);

module.exports = {
    itemSchema,
    Item
};