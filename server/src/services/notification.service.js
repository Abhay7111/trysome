const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');

async function createNotifications(notifications, io) {
    const validNotifications = notifications.filter(
        ({ recipient, actor }) => recipient && actor && String(recipient) !== String(actor)
    );
    if (!validNotifications.length) return [];

    const created = await notificationModel.insertMany(validNotifications);
    for (const notification of created) {
        io?.to(`user:${notification.recipient}`).emit('notification:new', {
            id: String(notification._id),
            type: notification.type
        });
    }
    return created;
}

function getMentionedUsernames(caption) {
    const usernames = new Set();
    const mentionPattern = /(^|[\s([{,;:!?])@([A-Za-z0-9_.-]+)/g;
    for (const match of String(caption ?? '').matchAll(mentionPattern)) {
        usernames.add(match[2]);
    }
    return usernames;
}

async function notifyPostMentions(post, actorId, previousCaption, io) {
    if (post.visibility !== 'public') return;

    const previousMentions = getMentionedUsernames(previousCaption);
    const newMentions = [...getMentionedUsernames(post.caption)]
        .filter((username) => !previousMentions.has(username));
    if (!newMentions.length) return;

    const [author, mentionedUsers] = await Promise.all([
        userModel.findById(actorId).select('isPrivate blockedUsers'),
        userModel.find({ username: { $in: newMentions } })
            .select('username following blockedUsers')
    ]);
    if (!author) return;

    const notifications = mentionedUsers
        .filter((user) => {
            const userFollowsAuthor = (user.following ?? []).some(
                (id) => String(id) === String(actorId)
            );
            const authorBlocksUser = (author.blockedUsers ?? []).some(
                (id) => String(id) === String(user._id)
            );
            const userBlocksAuthor = (user.blockedUsers ?? []).some(
                (id) => String(id) === String(actorId)
            );
            return (!author.isPrivate || userFollowsAuthor)
                && !authorBlocksUser
                && !userBlocksAuthor;
        })
        .map((user) => ({
            recipient: user._id,
            actor: actorId,
            type: 'tag',
            post: post._id
        }));

    await createNotifications(notifications, io);
}

module.exports = {
    createNotifications,
    notifyPostMentions
};
