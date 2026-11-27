const express = require('express');
const PostRoute = express.Router()
const authenticate = require('../middleware/auth.middleware')
const multer = require('multer')
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1 }
})

const postController = require('../controllers/post.controller')

PostRoute.get('/question', postController.questionPostController)
PostRoute.get('/feed', authenticate, postController.feedController)
PostRoute.get('/mine', authenticate, postController.myPostsController)
PostRoute.get('/interactions', authenticate, postController.interactionsController)
PostRoute.post('/tweet', authenticate, upload.any(), postController.postController)
PostRoute.patch('/:postId', authenticate, postController.updatePostController)
PostRoute.delete('/:postId', authenticate, postController.deletePostController)
PostRoute.post('/:postId/like', authenticate, postController.toggleLikeController)
PostRoute.post('/:postId/save', authenticate, postController.toggleSaveController)
PostRoute.post('/:postId/comments', authenticate, postController.addCommentController)

module.exports = PostRoute