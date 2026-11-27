const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const postModel = require('../models/post.model');
const { formatPost } = require('./post.controller');

async function getPublicProfileController(req, res) {
    const requestedUser = String(req.params.userId ?? '');
    if (!requestedUser || requestedUser.length > 80) {
        return res.status(400).json({ message: 'Invalid user id or username' });
    }

    try {
        const findTarget = async () => {
            if (mongoose.Types.ObjectId.isValid(requestedUser)) {
                const byId = await userModel.findById(
                    new mongoose.Types.ObjectId(requestedUser)
                ).select('username profile_img banner_img bio isPrivate blockedUsers following followRequests');
                if (byId) return byId;
            }
            return userModel.findOne({ username: requestedUser })
                .select('username profile_img banner_img bio isPrivate blockedUsers following followRequests');
        };
        const [target, viewer] = await Promise.all([
            findTarget(),
            userModel.findById(req.user.id).select('following blockedUsers')
        ]);

        if (!target || !viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isOwnProfile = String(target._id) === String(viewer._id);
        const blocksViewer = (target.blockedUsers ?? []).some(
            (id) => String(id) === String(viewer._id)
        );
        if (blocksViewer) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const isBlocked = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === String(target._id)
        );
        const isFollowing = (viewer.following ?? []).some(
            (id) => String(id) === String(target._id)
        );
        let posts = [];
        if (!isBlocked && (!target.isPrivate || isOwnProfile || isFollowing)) {
            posts = await postModel.find({
                user: target._id,
                $or: [
                    { visibility: 'public' },
                    { visibility: { $exists: false } }
                ]
            })
                .select('caption post_url visibility user createdAt likes comments')
                .populate('user', 'username profile_img')
                .populate('comments.user', 'username profile_img')
                .sort({ createdAt: -1 });
        }

        return res.status(200).json({
            profile: {
                id: String(target._id),
                username: target.username,
                profile_img: target.profile_img,
                banner_img: target.banner_img,
                bio: target.bio,
                isPrivate: target.isPrivate
            },
            isFollowing,
            isFollowedBy: (target.following ?? []).some(
                (id) => String(id) === String(viewer._id)
            ),
            hasRequestedFollow: (target.followRequests ?? []).some(
                (id) => String(id) === String(viewer._id)
            ),
            isBlocked,
            posts: posts.map(formatPost)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load public profile' });
    }
}

async function toggleFollowController(req, res) {
    const requestedId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    const targetId = new mongoose.Types.ObjectId(requestedId).toString();
    if (targetId === String(req.user.id)) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
        const [viewer, target] = await Promise.all([
            userModel.findById(req.user.id).select('following blockedUsers'),
            userModel.findById(targetId).select('following followRequests isPrivate blockedUsers')
        ]);

        if (!viewer || !target) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isBlocked = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === targetId
        );
        const hasBlockedViewer = (target.blockedUsers ?? []).some(
            (id) => String(id) === req.user.id
        );
        if (isBlocked || hasBlockedViewer) {
            return res.status(403).json({ message: 'This user cannot be followed' });
        }

        const isFollowing = (viewer.following ?? []).some(
            (id) => String(id) === targetId
        );
        const hasRequestedFollow = (target.followRequests ?? []).some(
            (id) => String(id) === String(req.user.id)
        );
        if (hasRequestedFollow) {
            await userModel.updateOne(
                { _id: targetId },
                { $pull: { followRequests: req.user.id } }
            );
            return res.status(200).json({ following: false, requested: false });
        }

        if (isFollowing) {
            await userModel.updateOne(
                { _id: req.user.id },
                { $pull: { following: targetId } }
            );
            const io = req.app.get('io');
            if (io?.revokeIneligibleChats) {
                await io.revokeIneligibleChats([String(req.user.id), targetId]);
            }
            return res.status(200).json({ following: false, requested: false });
        }

        if (target.isPrivate) {
            await userModel.updateOne(
                { _id: targetId },
                { $addToSet: { followRequests: req.user.id } }
            );
            return res.status(200).json({ following: false, requested: true });
        }

        await userModel.updateOne(
            { _id: req.user.id },
            { $addToSet: { following: targetId } }
        );
        return res.status(200).json({ following: true, requested: false });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update follow status' });
    }
}

async function listFollowRequestsController(req, res) {
    try {
        const viewer = await userModel.findById(req.user.id)
            .select('followRequests')
            .populate('followRequests', 'username profile_img');
        if (!viewer) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({
            requests: (viewer.followRequests ?? []).filter(Boolean).map((user) => ({
                id: String(user._id),
                username: user.username,
                profile_img: user.profile_img
            }))
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load follow requests' });
    }
}

async function respondToFollowRequestController(req, res) {
    const requesterId = req.params.userId;
    const { accept } = req.body ?? {};
    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    if (typeof accept !== 'boolean') {
        return res.status(400).json({ message: 'accept must be a boolean' });
    }

    try {
        const [owner, requester] = await Promise.all([
            userModel.findById(req.user.id).select('followRequests blockedUsers'),
            userModel.findById(requesterId).select('blockedUsers')
        ]);
        if (!owner || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }
        const hasRequest = (owner.followRequests ?? []).some(
            (id) => String(id) === String(requesterId)
        );
        if (!hasRequest) {
            return res.status(404).json({ message: 'Follow request not found' });
        }
        const isBlocked = (owner.blockedUsers ?? []).some(
            (id) => String(id) === String(requesterId)
        ) || (requester.blockedUsers ?? []).some(
            (id) => String(id) === String(req.user.id)
        );
        if (isBlocked) {
            return res.status(403).json({ message: 'This follow request cannot be accepted' });
        }

        const updates = [
            userModel.updateOne(
                { _id: req.user.id },
                { $pull: { followRequests: requesterId } }
            )
        ];
        if (accept) {
            updates.push(userModel.updateOne(
                { _id: requesterId },
                { $addToSet: { following: req.user.id } }
            ));
        }
        await Promise.all(updates);
        return res.status(200).json({ accepted: accept });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to respond to follow request' });
    }
}

async function toggleBlockController(req, res) {
    const requestedId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    const targetId = new mongoose.Types.ObjectId(requestedId).toString();
    if (targetId === String(req.user.id)) {
        return res.status(400).json({ message: 'You cannot block yourself' });
    }

    try {
        const [viewer, target] = await Promise.all([
            userModel.findById(req.user.id).select('blockedUsers'),
            userModel.findById(targetId).select('blockedUsers')
        ]);

        if (!viewer || !target) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isBlocked = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === targetId
        );

        if (isBlocked) {
            await userModel.updateOne(
                { _id: req.user.id },
                { $pull: { blockedUsers: targetId } }
            );
        } else {
            await Promise.all([
                userModel.updateOne(
                    { _id: req.user.id },
                    {
                        $addToSet: { blockedUsers: targetId },
                        $pull: { following: targetId, followRequests: targetId }
                    }
                ),
                userModel.updateOne(
                    { _id: targetId },
                    {
                        $pull: {
                            following: req.user.id,
                            followRequests: req.user.id
                        }
                    }
                )
            ]);
            const io = req.app.get('io');
            if (io?.revokeIneligibleChats) {
                await io.revokeIneligibleChats([String(req.user.id), targetId]);
            }
        }

        return res.status(200).json({ blocked: !isBlocked });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update block status' });
    }
}

module.exports = {
    getPublicProfileController,
    toggleFollowController,
    listFollowRequestsController,
    respondToFollowRequestController,
    toggleBlockController
};
