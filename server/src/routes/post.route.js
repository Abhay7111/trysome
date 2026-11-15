const express = require('express');
const PostRoute = express.Router()
const authenticate = require('../middleware/auth.middleware')

const postController = require('../controllers/post.controller')

PostRoute.get('/question', postController.questionPostController)
PostRoute.post('/tweet', authenticate, postController.postController)

module.exports = PostRoute