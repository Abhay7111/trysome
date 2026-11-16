const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    caption: {
        type: String,
        required: true,
    },
    post_url: {
        type: String,
    },
    user: {
        ref: "users",
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "user id is required for creating post"]
    }
},{
    timestamps: true
})

const postModel = mongoose.model("posts", postSchema);

module.exports = postModel