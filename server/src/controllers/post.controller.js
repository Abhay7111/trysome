const postModel = require('../models/post.model')

async function postController(req, res) {
    const {caption, post_url } = req.body
    const user = req.user?.id
    try{
        if(!user){
            return res.status(404).json({
                message: "user not found"
            })
        }
        if(!caption){
            return res.status(404).json({
                message: "Caption is required for post"
            })
        }
        const post = await postModel.create({
            caption: caption,
            post_url: post_url,
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

async function questionPostController(req, res) {
    res.status(200).json({
        message: "This is post controller"
    })
}

module.exports = {
    questionPostController,
    postController
}