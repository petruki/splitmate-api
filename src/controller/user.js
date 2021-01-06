const { User, Plan } = require('../models');
const { NotFoundError } = require('../exceptions');

async function getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('user');
    return user;
}

async function getUsersById(ids) {
    const users = await User.find({ _id: ids });
    if (!users || !users.length) throw new NotFoundError('user');
    return users;
}

async function getUser(where) {
    const user = await User.findOne(where);
    if (!user) throw new NotFoundError('user');
    return user;
}

async function getUserPlan(planId) {
    return await Plan.findById(planId);
}

module.exports = {
    getUserById,
    getUsersById,
    getUser,
    getUserPlan
};