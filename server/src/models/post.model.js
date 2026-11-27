const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    caption: {
        type: String,
        required: true,
    },
    post_url: {
        type: String,
    },
    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    },
    user: {
        ref: "user",
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "user id is required for creating post"]
    },
    likes: [{
        ref: "user",
        type: mongoose.Schema.Types.ObjectId
    }],
    comments: [{
        user: {
            ref: "user",
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        text: {
            type: String,
            required: true,
            maxlength: 280
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
},{
    timestamps: true
})

const postModel = mongoose.model("posts", postSchema);

module.exports = postModel