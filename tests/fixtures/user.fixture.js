const { User, Plan } = require('../../src/models');
const { PlanType } = require('../../src/models/plan');

const setupUserCollection = async () => {
    await User.deleteMany();

    //setup User 1
    const user1 = new User({
        name: 'User 1',
        username: 'user1',
        email: 'user1@mail.com',
        password: '123',
    });
    const plan = await Plan.findOne({ name: PlanType.FOUNDER });
    user1.plan = plan._id;
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

    return [
        user1,
        user2
    ];
};

const getUser = (users, email) => {
    return users.filter(user => user.email === email)[0];
};

module.exports = { 
    setupUserCollection, 
    getUser 
};