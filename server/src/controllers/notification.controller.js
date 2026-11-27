const notificationModel = require('../models/notification.model');

function serializeNotification(notification) {
    return {
        id: String(notification._id),
        type: notification.type,
        actor: notification.actor?._id
            ? {
                id: String(notification.actor._id),
                username: notification.actor.username,
                profile_img: notification.actor.profile_img
            }
            : null,
        postId: notification.post?._id
            ? String(notification.post._id)
            : notification.post
                ? String(notification.post)
                : null,
        postAuthorId: notification.post?.user
            ? String(notification.post.user._id ?? notification.post.user)
            : null,
        conversationId: notification.conversation
            ? String(notification.conversation._id ?? notification.conversation)
            : null,
        read: notification.read,
        createdAt: notification.createdAt
    };
}

async function listNotificationsController(req, res) {
    try {
        const [notifications, unreadCount] = await Promise.all([
            notificationModel.find({ recipient: req.user.id })
                .populate('actor', 'username profile_img')
                .populate({ path: 'post', select: 'user' })
                .sort({ createdAt: -1 })
                .limit(100),
            notificationModel.countDocuments({
                recipient: req.user.id,
                read: false
            })
        ]);
        return res.status(200).json({
            notifications: notifications.map(serializeNotification),
            unreadCount
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load notifications' });
    }
}

async function unreadNotificationCountController(req, res) {
    try {
        const unreadCount = await notificationModel.countDocuments({
            recipient: req.user.id,
            read: false
        });
        return res.status(200).json({ unreadCount });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load notification count' });
    }
}

async function markNotificationsReadController(req, res) {
    try {
        const result = await notificationModel.updateMany(
            { recipient: req.user.id, read: false },
            { $set: { read: true } }
        );
        req.app.get('io')?.to(`user:${req.user.id}`).emit('notification:read');
        return res.status(200).json({ updatedCount: result.modifiedCount });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to mark notifications as read' });
    }
}

module.exports = {
    listNotificationsController,
    unreadNotificationCountController,
    markNotificationsReadController
};
