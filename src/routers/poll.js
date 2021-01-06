const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/index');
const { Event } = require('../models/event');
const { responseException } = require('./common/index');
const { NotFoundError } = require('../exceptions');

const router = new express.Router();

router.patch('/v1/:eventid/:itemid/:pollitemid', [
    check('eventid', 'Invalid Event Id').isMongoId(),
    check('itemid', 'Invalid Item Id').isMongoId(),
    check('pollitemid', 'Invalid Poll Item Id').isMongoId()
], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const event = await Event.findOne({ _id: req.params.eventid, members: req.user._id });
        if (!event) {
            throw new NotFoundError('event');
        }

        const itemToVote = event.items.filter(item => String(item._id) === String(req.params.itemid));
        if (itemToVote.length && itemToVote[0].poll.length) {
            //Clean last vote
            itemToVote[0].poll.forEach(poll => {
                const indexVoter = poll.votes.indexOf(String(req.user._id));
                if (indexVoter >= 0) poll.votes.splice(indexVoter, 1);
            });

            //Apply vote
            const valueToVote = itemToVote[0].poll.filter(
                pollVote => String(pollVote._id) === String(req.params.pollitemid));

            valueToVote[0].votes.push(String(req.user._id));
        } else {
            throw new NotFoundError('poll');
        }
        
        await event.save();
        res.send(itemToVote[0]);
    } catch (e) {
        responseException(res, e, 500);
    }
});

module.exports = router;