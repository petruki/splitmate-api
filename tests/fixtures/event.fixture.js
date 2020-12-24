const mongoose = require('mongoose');
const { Event, User } = require('../../src/models');

const event1 = new Event({
    _id: new mongoose.Types.ObjectId(),
    name: 'Event 1',
    description: 'description',
    date: Date.now(),
    location: 'location',
    members: [],
    items: [],
    version: Date.now().toString()
});

const setupEventCollection = async () => {
    const user1 = await User.findOne({ username: 'user1' });

    //setup Event 1
    event1.organizer = user1._id;
    await event1.save();
};

module.exports = { 
    setupEventCollection,
    event1 
};