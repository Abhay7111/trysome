const postModel = require('../models/post.model');
const userModel = require('../models/user.model');
const { formatPost } = require('./post.controller');
const authenticate = require('../middleware/auth.middleware');

async function publicController(req, res) {
    const privateUserIds = await userModel.find({ isPrivate: true }).distinct('_id');
    const posts = await postModel.find({
        user: { $nin: privateUserIds },
        $or: [
            { visibility: 'public' },
            { visibility: { $exists: false } }
        ]
    })
        .select('caption post_url visibility user createdAt likes comments')
        .populate('user', 'username profile_img')
        .populate('comments.user', 'username profile_img')
        .sort({ createdAt: -1 });

    return res.status(200).json({
        message: "post fetched successfully",
        posts: posts.map(formatPost)
    })
}

async function searchController(req, res) {
    const query = String(req.query.q ?? '').trim();
    const type = String(req.query.type ?? '');
    if (query.length < 2 || query.length > 80) {
        return res.status(400).json({ message: 'Search must be between 2 and 80 characters' });
    }
    if (!['posts', 'users', 'tags'].includes(type)) {
        return res.status(400).json({ message: 'Search type must be posts, users, or tags' });
    }
    const tagQuery = query.startsWith('#') ? query.slice(1) : query;
    if (type === 'tags' && !/^[a-zA-Z0-9_]{2,80}$/.test(tagQuery)) {
        return res.status(400).json({ message: 'Tags must contain 2 to 80 letters, numbers, or underscores' });
    }

    try {
        const viewer = await userModel.findById(req.user.id)
            .select('blockedUsers following')
            .lean();
        if (!viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const blockedByViewer = viewer.blockedUsers ?? [];
        const blockedViewer = await userModel.find({
            blockedUsers: req.user.id
        }).distinct('_id');
        const hiddenUserIds = [...blockedByViewer, ...blockedViewer];
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchingText = type === 'tags'
            ? new RegExp(`(^|[^a-zA-Z0-9_])#${tagQuery}(?![a-zA-Z0-9_])`, 'i')
            : new RegExp(escapedQuery, 'i');

        if (type === 'users') {
            const users = await userModel.find({
                username: matchingText,
                _id: { $nin: hiddenUserIds }
            })
                .select('username profile_img banner_img bio isPrivate following followRequests')
                .sort({ username: 1 })
                .limit(50)
                .lean();
            const followedIds = new Set((viewer.following ?? []).map(String));
            return res.status(200).json({
                users: users.map((user) => ({
                    id: String(user._id),
                    username: user.username,
                    profile_img: user.profile_img,
                    banner_img: user.banner_img,
                    bio: user.bio,
                    isPrivate: user.isPrivate,
                    isFollowing: followedIds.has(String(user._id)),
                    followsYou: (user.following ?? []).some(
                        (id) => String(id) === String(req.user.id)
                    ),
                    hasRequestedFollow: (user.followRequests ?? []).some(
                        (id) => String(id) === String(req.user.id)
                    )
                }))
            });
        }

        const privateUserIds = await userModel.find({ isPrivate: true }).distinct('_id');
        const posts = await postModel.find({
            caption: matchingText,
            user: { $nin: [...hiddenUserIds, ...privateUserIds] },
            $or: [
                { visibility: 'public' },
                { visibility: { $exists: false } }
            ]
        })
            .select('caption post_url visibility user createdAt likes comments')
            .populate('user', 'username profile_img')
            .populate('comments.user', 'username profile_img')
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({ posts: posts.map(formatPost) });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to search' });
    }
}

async function highlightsController(req, res) {
    try {
        const viewer = await userModel.findById(req.user.id)
            .select('blockedUsers')
            .lean();
        if (!viewer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [blockedViewer, privateUsers] = await Promise.all([
            userModel.find({ blockedUsers: req.user.id }).distinct('_id'),
            userModel.find({ isPrivate: true }).distinct('_id')
        ]);
        const hiddenUserIds = [
            ...(viewer.blockedUsers ?? []),
            ...blockedViewer,
            ...privateUsers,
            req.user.id
        ];
        const [users, posts] = await Promise.all([
            userModel.find({
                isPrivate: false,
                _id: { $nin: hiddenUserIds }
            })
                .select('username profile_img bio')
                .sort({ createdAt: -1 })
                .limit(4)
                .lean(),
            postModel.find({
                user: { $nin: hiddenUserIds },
                $or: [
                    { visibility: 'public' },
                    { visibility: { $exists: false } }
                ]
            })
                .select('caption post_url visibility user createdAt likes comments')
                .populate('user', 'username profile_img')
                .sort({ createdAt: -1 })
                .limit(4)
        ]);

        return res.status(200).json({
            users: users.map((user) => ({
                id: String(user._id),
                username: user.username,
                profile_img: user.profile_img,
                bio: user.bio
            })),
            posts: posts.map(formatPost)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load home highlights' });
    }
}

module.exports = {
    publicController,
    searchController,
    highlightsController
}