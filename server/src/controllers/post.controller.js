const postModel = require('../models/post.model')
const ImageKey = require('@imagekit/nodejs')
const {toFile} = require('@imagekit/nodejs')

const imagekit = new ImageKey({
    privatekey: process.env.IMAGEKIT_PRIVATE_KEY
})

async function postController(req, res) {
    const { caption } = req.body ?? {};
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

        const uploadedFile = req.files?.[0]
        if (!uploadedFile) {
            return res.status(400).json({
                message: "Image file is required"
            })
        }

        const file = await imagekit.files.upload({
            file: await toFile(uploadedFile.buffer, uploadedFile.originalname),
            fileName: uploadedFile.originalname,
            folder: "Tweet-clone"
        })
        const post = await postModel.create({
            caption,
            post_url: file.url,
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