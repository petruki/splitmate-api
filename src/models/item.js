const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    individual: {
        type: Boolean,
        default: false
    },
    type: {
        type: String
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

const Item = mongoose.model('Item', itemSchema);

module.exports = {
    itemSchema,
    Item
};