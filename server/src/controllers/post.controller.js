const postModel = require('../models/post.model')
const userModel = require('../models/user.model')
const mongoose = require('mongoose')
const uploadImage = require('../services/imagekit.service')

async function postController(req, res) {
    const caption = String(req.body?.caption ?? '').trim();
    const visibility = req.body?.visibility ?? 'public';
    const user = req.user?.id
    try{
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        if (!caption) {
            return res.status(400).json({
                message: "Caption is required for post"
            })
        }
        if (!['public', 'private'].includes(visibility)) {
            return res.status(400).json({
                message: "Visibility must be public or private"
            })
        }

        const uploadedFile = req.files?.[0]
        let imageUrl
        if (uploadedFile) {
            imageUrl = await uploadImage(uploadedFile.buffer, uploadedFile.originalname)
        }

        const post = await postModel.create({
            caption,
            post_url: imageUrl,
            visibility,
            user
        })

        return res.status(201).json({
            message: "post created successfully",
            post: post
        })
    }catch (err) {
        res.status(500).json({
            message: `internal server error ${err}`,
        })
    }
}

async function myPostsController(req, res) {
    try {
        const posts = await postModel.find({ user: req.user.id })
            .select('caption post_url visibility user createdAt likes comments')
            .populate('comments.user', 'username profile_img')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "user posts fetched successfully",
            posts: posts.map(formatPost)
        });
    } catch (err) {
        return res.status(500).json({
            message: "Unable to fetch user posts"
        });
    }
}

async function feedController(req, res) {
    try {
        const [privateUserIds, viewer, blockedByUserIds] = await Promise.all([
            userModel.find({
                isPrivate: true,
                _id: { $ne: req.user.id }
            }).distinct('_id'),
            userModel.findById(req.user.id).select('blockedUsers').lean(),
            userModel.find({ blockedUsers: req.user.id }).distinct('_id')
        ]);
        const hiddenUserIds = [
            ...privateUserIds,
            ...(viewer?.blockedUsers ?? []),
            ...blockedByUserIds
        ];

        const posts = await postModel.find({
            $or: [
                { user: req.user.id },
                {
                    user: { $nin: hiddenUserIds },
                    $or: [
                        { visibility: 'public' },
                        { visibility: { $exists: false } }
                    ]
                }
            ]
        })
            .select('caption post_url visibility user createdAt likes comments')
            .populate('user', 'username profile_img')
            .populate('comments.user', 'username profile_img')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "feed fetched successfully",
            posts: posts.map(formatPost)
        });
    } catch (err) {
        return res.status(500).json({
            message: "Unable to fetch feed"
        });
    }
}

async function interactionsController(req, res) {
    try {
        const [likedPosts, user] = await Promise.all([
            postModel.find({ likes: req.user.id }).select('_id').lean(),
            userModel.findById(req.user.id)
                .select('savedPosts following blockedUsers')
                .populate('blockedUsers', 'username profile_img')
                .lean()
        ]);
        const blockedUsers = (user?.blockedUsers ?? []).filter(Boolean);

        return res.status(200).json({
            likedPostIds: likedPosts.map(({ _id }) => String(_id)),
            savedPostIds: (user?.savedPosts ?? []).map(String),
            followingUserIds: (user?.following ?? []).map(String),
            blockedUserIds: blockedUsers.map(({ _id }) => String(_id)),
            blockedUsers: blockedUsers.map((blockedUser) => ({
                id: String(blockedUser._id),
                username: blockedUser.username,
                profile_img: blockedUser.profile_img
            }))
        });
    } catch (err) {
        return res.status(500).json({
            message: "Unable to fetch post interactions"
        });
    }
}

async function canViewPost(post, viewerId) {
    if (String(post.user) === String(viewerId)) {
        return true;
    }

    if ((post.visibility ?? 'public') !== 'public') {
        return false;
    }

    const [owner, viewer] = await Promise.all([
        userModel.findById(post.user).select('isPrivate blockedUsers').lean(),
        userModel.findById(viewerId).select('blockedUsers').lean()
    ]);

    if (!owner || !viewer) return false;
    const viewerBlocksOwner = (viewer.blockedUsers ?? []).some(
        (id) => String(id) === String(owner._id)
    );
    const ownerBlocksViewer = (owner.blockedUsers ?? []).some(
        (id) => String(id) === String(viewer._id)
    );

    return !owner.isPrivate && !viewerBlocksOwner && !ownerBlocksViewer;
}

async function toggleLikeController(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid post id" });
    }

    try {
        const post = await postModel.findById(req.params.postId)
            .select('likes user visibility');
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (!await canViewPost(post, req.user.id)) {
            return res.status(404).json({ message: "Post not found" });
        }

        const alreadyLiked = (post.likes ?? []).some(
            (id) => String(id) === req.user.id
        );
        const update = alreadyLiked
            ? { $pull: { likes: req.user.id } }
            : { $addToSet: { likes: req.user.id } };
        const updatedPost = await postModel.findByIdAndUpdate(
            req.params.postId,
            update,
            { new: true }
        ).select('likes');

        return res.status(200).json({
            liked: !alreadyLiked,
            likeCount: updatedPost.likes?.length ?? 0
        });
    } catch (err) {
        return res.status(500).json({ message: "Unable to update like" });
    }
}

async function toggleSaveController(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid post id" });
    }

    try {
        const [post, user] = await Promise.all([
            postModel.findById(req.params.postId).select('user visibility'),
            userModel.findById(req.user.id).select('savedPosts')
        ]);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (!await canViewPost(post, req.user.id)) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const alreadySaved = (user.savedPosts ?? []).some(
            (id) => String(id) === req.params.postId
        );
        const update = alreadySaved
            ? { $pull: { savedPosts: req.params.postId } }
            : { $addToSet: { savedPosts: req.params.postId } };
        await userModel.updateOne({ _id: req.user.id }, update);

        return res.status(200).json({ saved: !alreadySaved });
    } catch (err) {
        return res.status(500).json({ message: "Unable to update saved post" });
    }
}

async function addCommentController(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
        return res.status(400).json({ message: "Invalid post id" });
    }

    const text = String(req.body?.text ?? '').trim();
    if (!text || text.length > 280) {
        return res.status(400).json({
            message: "Comment must be between 1 and 280 characters"
        });
    }

    try {
        const post = await postModel.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (!await canViewPost(post, req.user.id)) {
            return res.status(404).json({ message: "Post not found" });
        }

        post.comments.push({ user: req.user.id, text });
        await post.save();
        await post.populate('comments.user', 'username profile_img');
        const comment = post.comments[post.comments.length - 1];

        return res.status(201).json({
            comment: {
                _id: comment._id,
                text: comment.text,
                createdAt: comment.createdAt,
                user: comment.user
            },
            commentCount: post.comments.length
        });
    } catch (err) {
        return res.status(500).json({ message: "Unable to add comment" });
    }
}

async function updatePostController(req, res) {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: "Invalid post id" });
    }

    const body = req.body ?? {};
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'caption')) {
        if (typeof body.caption !== 'string') {
            return res.status(400).json({ message: "Caption must be text" });
        }
        const caption = body.caption.trim();
        if (!caption || caption.length > 280) {
            return res.status(400).json({
                message: "Caption must be between 1 and 280 characters"
            });
        }
        updates.caption = caption;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'visibility')) {
        if (!['public', 'private'].includes(body.visibility)) {
            return res.status(400).json({
                message: "Visibility must be public or private"
            });
        }
        updates.visibility = body.visibility;
    }
    if (!Object.keys(updates).length) {
        return res.status(400).json({ message: "No post updates provided" });
    }

    try {
        const post = await postModel.findOne({
            _id: postId,
            user: req.user.id
        });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        Object.assign(post, updates);
        await post.save();
        await post.populate([
            { path: 'user', select: 'username profile_img' },
            { path: 'comments.user', select: 'username profile_img' }
        ]);
        return res.status(200).json({ post: formatPost(post) });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update post" });
    }
}

async function deletePostController(req, res) {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: "Invalid post id" });
    }

    try {
        const post = await postModel.findOneAndDelete({
            _id: postId,
            user: req.user.id
        });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        await userModel.updateMany(
            { savedPosts: post._id },
            { $pull: { savedPosts: post._id } }
        );
        return res.status(200).json({ deleted: true });
    } catch (error) {
        return res.status(500).json({ message: "Unable to delete post" });
    }
}

function formatPost(post) {
    return {
        _id: post._id,
        caption: post.caption,
        post_url: post.post_url,
        visibility: post.visibility ?? 'public',
        createdAt: post.createdAt,
        user: post.user,
        likeCount: post.likes?.length ?? 0,
        comments: post.comments ?? []
    };
}

async function questionPostController(req, res) {
    res.status(200).json({
        message: "This is post controller"
    })
}

module.exports = {
    questionPostController,
    postController,
    myPostsController,
    feedController,
    interactionsController,
    toggleLikeController,
    toggleSaveController,
    addCommentController,
    updatePostController,
    deletePostController,
    formatPost
}