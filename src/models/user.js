const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Event } = require('./event');
const { PermissionError, BadRequest } = require('../routers/common/index');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    },
    token: {
        type: String
    },
    events_pending: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    events_archived: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }]
});

userSchema.virtual('v_events_pending', {
    ref: 'Event',
    localField: 'events_pending',
    foreignField: '_id'
});

userSchema.virtual('v_events_archived', {
    ref: 'Event',
    localField: 'events_archived',
    foreignField: '_id'
});

userSchema.virtual('v_plan', {
    ref: 'Plan',
    localField: 'plan',
    foreignField: '_id',
    justOne : true
});

userSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret) {
        if (!ret._id)
            delete ret.id;
            
        delete ret.password;
        delete ret.token;
        return ret;
    }
};

userSchema.methods.generateAuthToken = async function () {
    const user = this;

    user.token = jwt.sign(({ _id: user.id.toString() }), process.env.JWT_SECRET);
    await user.save();

    return {
        token: user.token
    };
};

userSchema.statics.findByCredentials = async (username, password) => {
    const user = await User.findOne({ username });

    if (!user) {
        throw new PermissionError('Invalid email/password');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new PermissionError('Invalid email/password');
    }

    return user;
};

userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    
    next();
});

userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        return next(new BadRequest('User already exist'));
    }
    
    next(error);
});

userSchema.pre('remove', async function (next) {
    const user = this;
    
    let events = await Event.find({ members: user._id });
    for (let index = 0; index < events.length; index++) {
        const element = events[index];
        element.members.splice(element.members.indexOf(user._id), 1);
        await element.save();
    }

    events = await Event.find({ organizer: user._id });
    for (let index = 0; index < events.length; index++) {
        const element = events[index];
        const nextOrganizer = element.members.filter(member => member._id !== user._id);

        if (nextOrganizer.length) {
            element.organizer = nextOrganizer[0];
            await element.save();
        } else {
            await element.remove();
        }
    }

    next();
});

const User = mongoose.model('User', userSchema);

module.exports = {
    User
};