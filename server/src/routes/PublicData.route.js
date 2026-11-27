const express = require('express');
const public = require('../controllers/Public.controller');
const authenticate = require('../middleware/auth.middleware');

const PublicRoute = express.Router()

PublicRoute.get('/explore/search', authenticate, public.searchController)
PublicRoute.get('/explore/highlights', authenticate, public.highlightsController)
PublicRoute.get('/', public.publicController)

module.exports = PublicRoute