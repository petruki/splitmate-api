const { User, Plan } = require('../models');

async function getUserById(id) {
    return await User.findById(id);
}

async function getUsersById(ids) {
    return await User.find({ _id: ids });
}

async function getUserPlan(planId) {
    return await Plan.findById(planId);
}

module.exports = {
    getUserById,
    getUsersById,
    getUserPlan
};