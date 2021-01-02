const { Event, User, Plan } = require('../../src/models');

const restoreDb = async () => {
    await Event.deleteMany();
    await User.deleteMany();
    await Plan.deleteMany();
};

module.exports = restoreDb;