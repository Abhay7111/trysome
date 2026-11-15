const express = require('express');
const public = require('../controllers/Public.controller');

const PublicRoute = express.Router()

PublicRoute.get('/', public.publicController)

module.exports = PublicRoute