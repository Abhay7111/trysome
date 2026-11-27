const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

const userRoute = express.Router();

userRoute.get('/follow-requests', authenticate, userController.listFollowRequestsController);
userRoute.patch(
    '/follow-requests/:userId',
    authenticate,
    userController.respondToFollowRequestController
);
userRoute.get('/:userId', authenticate, userController.getPublicProfileController);
userRoute.post('/:userId/follow', authenticate, userController.toggleFollowController);
userRoute.post('/:userId/block', authenticate, userController.toggleBlockController);

module.exports = userRoute;
