const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { User } = require('../models/user');

const router = new express.Router();

router.post('/user/signup', [
    check('name').isLength({ min: 2 }),
    check('username').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const user = new User(req.body);
        const jwt = await user.generateAuthToken();

        res.status(201).send({ user, jwt });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
})

router.post('/user/login', async (req, res) => {
    //TODO: implement login
})

router.post('/user/logout', auth, async (req, res) => {
    req.user.token = null;
    await req.user.save();
    res.send();
})

router.get('/user/me', auth, async (req, res) => {
    res.send(req.user);
})

//TODO: [GET] /user/:username

module.exports = router;