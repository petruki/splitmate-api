const mongoose = require('mongoose');

const userInviteSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    eventid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Event'
    }
}, {
    timestamps: true
})

userInviteSchema.virtual('v_event', {
    ref: 'Event',
    localField: 'eventid',
    foreignField: '_id'
})

const UserInvite = mongoose.model('UserInvite', userInviteSchema);

module.exports = {
    UserInvite
};