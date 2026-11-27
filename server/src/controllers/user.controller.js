const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const postModel = require('../models/post.model');
const { formatPost } = require('./post.controller');
const { createNotifications } = require('../services/notification.service');

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

        const [followersCount, postsCount] = await Promise.all([
            userModel.countDocuments({ following: target._id }),
            postModel.countDocuments({ user: target._id })
        ]);

        return res.status(200).json({
            profile: {
                id: String(target._id),
                username: target.username,
                profile_img: target.profile_img,
                banner_img: target.banner_img,
                bio: target.bio,
                isPrivate: target.isPrivate,
                postsCount,
                followersCount,
                followingCount: (target.following ?? []).length
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

async function listFollowersController(req, res) {
    const requestedUser = String(req.params.userId ?? '');
    if (!requestedUser || requestedUser.length > 80) {
        return res.status(400).json({ message: 'Invalid user id or username' });
    }

    try {
        const findTarget = async () => {
            if (mongoose.Types.ObjectId.isValid(requestedUser)) {
                const byId = await userModel.findById(
                    new mongoose.Types.ObjectId(requestedUser)
                ).select('username isPrivate blockedUsers');
                if (byId) return byId;
            }
            return userModel.findOne({ username: requestedUser })
                .select('username isPrivate blockedUsers');
        };
        const [target, viewer] = await Promise.all([
            findTarget(),
            userModel.findById(req.user.id).select('_id following blockedUsers')
        ]);
        if (!target || !viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isOwnProfile = String(target._id) === String(viewer._id);
        const targetBlocksViewer = (target.blockedUsers ?? []).some(
            (id) => String(id) === String(viewer._id)
        );
        const viewerBlocksTarget = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === String(target._id)
        );
        if (targetBlocksViewer || viewerBlocksTarget) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const isFollowing = (viewer.following ?? []).some(
            (id) => String(id) === String(target._id)
        );
        if (target.isPrivate && !isOwnProfile && !isFollowing) {
            return res.status(403).json({ message: 'Follow this account to view its followers' });
        }

        const followers = await userModel.find({
            following: target._id,
            _id: {
                $nin: [...(target.blockedUsers ?? []), ...(viewer.blockedUsers ?? [])]
            },
            blockedUsers: { $nin: [target._id, viewer._id] }
        }).select('username profile_img bio');

        return res.status(200).json({
            followers: followers.map((follower) => ({
                id: String(follower._id),
                username: follower.username,
                profile_img: follower.profile_img,
                bio: follower.bio ?? ''
            }))
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load followers' });
    }
}

async function listFollowingController(req, res) {
    const requestedUser = String(req.params.userId ?? '');
    if (!requestedUser || requestedUser.length > 80) {
        return res.status(400).json({ message: 'Invalid user id or username' });
    }

    try {
        const target = mongoose.Types.ObjectId.isValid(requestedUser)
            ? await userModel.findById(requestedUser)
                .select('isPrivate blockedUsers following')
            : await userModel.findOne({ username: requestedUser })
                .select('isPrivate blockedUsers following');
        const viewer = await userModel.findById(req.user.id)
            .select('_id following blockedUsers');
        if (!target || !viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isOwnProfile = String(target._id) === String(viewer._id);
        const targetBlocksViewer = (target.blockedUsers ?? []).some(
            (id) => String(id) === String(viewer._id)
        );
        const viewerBlocksTarget = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === String(target._id)
        );
        const isFollowing = (viewer.following ?? []).some(
            (id) => String(id) === String(target._id)
        );
        if (targetBlocksViewer || viewerBlocksTarget) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        if (target.isPrivate && !isOwnProfile && !isFollowing) {
            return res.status(403).json({ message: 'Follow this account to view its following list' });
        }

        const users = await userModel.find({
            _id: {
                $in: target.following ?? [],
                $nin: [...(target.blockedUsers ?? []), ...(viewer.blockedUsers ?? [])]
            },
            blockedUsers: { $nin: [target._id, viewer._id] }
        }).select('username profile_img bio');
        return res.status(200).json({
            users: users.map((user) => ({
                id: String(user._id),
                username: user.username,
                profile_img: user.profile_img,
                bio: user.bio ?? ''
            }))
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load following list' });
    }
}

async function profileStatsController(req, res) {
    const requestedUser = String(req.params.userId ?? '');
    if (!requestedUser || requestedUser.length > 80) {
        return res.status(400).json({ message: 'Invalid user id or username' });
    }

    try {
        const target = mongoose.Types.ObjectId.isValid(requestedUser)
            ? await userModel.findById(requestedUser)
                .select('isPrivate blockedUsers following')
            : await userModel.findOne({ username: requestedUser })
                .select('isPrivate blockedUsers following');
        const viewer = await userModel.findById(req.user.id)
            .select('_id following blockedUsers');
        if (!target || !viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isOwnProfile = String(target._id) === String(viewer._id);
        const isFollowing = (viewer.following ?? []).some(
            (id) => String(id) === String(target._id)
        );
        const targetBlocksViewer = (target.blockedUsers ?? []).some(
            (id) => String(id) === String(viewer._id)
        );
        const viewerBlocksTarget = (viewer.blockedUsers ?? []).some(
            (id) => String(id) === String(target._id)
        );
        if (targetBlocksViewer || viewerBlocksTarget) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        if (target.isPrivate && !isOwnProfile && !isFollowing) {
            return res.status(403).json({ message: 'Follow this account to view its profile counts' });
        }

        const [followersCount, postsCount] = await Promise.all([
            userModel.countDocuments({ following: target._id }),
            postModel.countDocuments({ user: target._id })
        ]);
        return res.status(200).json({
            followersCount,
            followingCount: (target.following ?? []).length,
            postsCount
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load profile counts' });
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
        try {
            await createNotifications([{
                recipient: targetId,
                actor: req.user.id,
                type: 'follow'
            }], req.app.get('io'));
        } catch (notificationError) {
            console.error('Unable to create follow notification', notificationError);
        }
        return res.status(200).json({ following: true, requested: false });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update follow status' });
    }
}

async function listFollowRequestsController(req, res) {
    try {
        const viewer = await userModel.findById(req.user.id)
            .select('followRequests');
        if (!viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const requesterIds = (viewer.followRequests ?? []).filter(Boolean);
        const [requesters, followerCounts] = await Promise.all([
            userModel.aggregate([
                { $match: { _id: { $in: requesterIds } } },
                {
                    $project: {
                        username: 1,
                        profile_img: 1,
                        bio: 1,
                        followingCount: {
                            $size: { $ifNull: ['$following', []] }
                        }
                    }
                }
            ]),
            requesterIds.length
                ? userModel.aggregate([
                    { $match: { following: { $in: requesterIds } } },
                    { $unwind: '$following' },
                    { $match: { following: { $in: requesterIds } } },
                    {
                        $group: {
                            _id: { requester: '$following', follower: '$_id' }
                        }
                    },
                    {
                        $group: {
                            _id: '$_id.requester',
                            followersCount: { $sum: 1 }
                        }
                    }
                ])
                : []
        ]);
        const requesterById = new Map(
            requesters.map((user) => [String(user._id), user])
        );
        const followerCountById = new Map(
            followerCounts.map((entry) => [String(entry._id), entry.followersCount])
        );

        return res.status(200).json({
            requests: requesterIds.flatMap((id) => {
                const user = requesterById.get(String(id));
                if (!user) return [];
                return [{
                    id: String(user._id),
                    username: user.username,
                    profile_img: user.profile_img,
                    bio: user.bio ?? '',
                    followersCount: followerCountById.get(String(id)) ?? 0,
                    followingCount: user.followingCount ?? 0
                }];
            })
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
        if (accept) {
            try {
                await createNotifications([{
                    recipient: req.user.id,
                    actor: requesterId,
                    type: 'follow'
                }], req.app.get('io'));
            } catch (notificationError) {
                console.error('Unable to create accepted-follow notification', notificationError);
            }
        }
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
    listFollowersController,
    listFollowingController,
    profileStatsController,
    toggleFollowController,
    listFollowRequestsController,
    respondToFollowRequestController,
    toggleBlockController
};
