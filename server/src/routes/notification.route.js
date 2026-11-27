const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

const notificationRoute = express.Router();

notificationRoute.get(
    '/unread-count',
    authenticate,
    notificationController.unreadNotificationCountController
);
notificationRoute.get(
    '/',
    authenticate,
    notificationController.listNotificationsController
);
notificationRoute.patch(
    '/read',
    authenticate,
    notificationController.markNotificationsReadController
);

module.exports = notificationRoute;
