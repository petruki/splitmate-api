const { Plan, PlanType } = require('../../src/models/plan');

const setupDefaultPlan = async () => {
    await Plan.deleteMany();

    const defaultPlan = new Plan();
    await defaultPlan.save();

    const founderPlan = new Plan({
        name: PlanType.FOUNDER,
        enable_ads: false,
        enable_invite_email: true,
        max_events: -1,
        max_items: -1,
        max_poll_items: -1,
        max_members: -1
    });

    await founderPlan.save();
};

module.exports = { setupDefaultPlan };