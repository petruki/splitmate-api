const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    token: {
        type: String
    },
    events_pending: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }]
});

userSchema.virtual('v_events_pending', {
    ref: 'Event',
    localField: 'events_pending',
    foreignField: '_id'
});

userSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        delete ret.password;
        delete ret.token;
        return ret;
    }
}

userSchema.methods.generateAuthToken = async function () {
    const user = this;

    user.token = jwt.sign(({ _id: user.id.toString() }), process.env.JWT_SECRET);
    await user.save();

    return {
        token: user.token
    };
}

userSchema.statics.findByCredentials = async (username, password) => {
    const user = await User.findOne({ username });

    if (!user) {
        throw new Error('Unable to login');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error('Unable to login');
    }

    return user;
}

userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    
    next();
})

userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        return next(new Error('User already exist.'));
    }
    
    next(error);
});

userSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const user = this;
    // TODO: Remove events associated with user
    next();
})

const User = mongoose.model('User', userSchema);

module.exports = {
    User
};