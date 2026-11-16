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
PostRoute.post('/tweet', authenticate, upload.any(), postController.postController)

module.exports = PostRoute