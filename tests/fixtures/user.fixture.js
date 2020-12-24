const { User, Plan } = require('../../src/models');

const setupUserCollection = async () => {
    await User.deleteMany();

    //setup User 1
    const user1 = new User({
        name: 'User 1',
        username: 'user1',
        email: 'user1@mail.com',
        password: '123',
    });
    await Plan.setDefaultPlan(user1);
    await user1.save();

    //setup User 2
    const user2 = new User({
        name: 'User 2',
        username: 'user2',
        email: 'user2@mail.com',
        password: '123',
    });
    await Plan.setDefaultPlan(user2);
    await user2.save();
};

module.exports = { setupUserCollection };