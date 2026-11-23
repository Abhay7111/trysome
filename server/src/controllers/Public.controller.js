const postModel = require('../models/post.model');

async function publicController(req, res) {
    const posts = await postModel.find()
        .select('caption post_url');

    return res.status(200).json({
        message: "post fetched successfully",
        posts
    })
}

module.exports = {
    publicController
}