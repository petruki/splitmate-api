const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { Event } = require('../models/event');

const router = new express.Router();

//TODO: [POST] /event/create
//TODO: [PATCH] /event/:id
//TODO: [DELETE] /event/:id
//TODO: [GET] /event/:organizer
//TODO: [GET] /event/:member

module.exports = router;