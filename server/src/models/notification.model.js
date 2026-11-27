const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    actor: {
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    type: {
        type: String,
        enum: ['tag', 'like', 'follow', 'message'],
        required: true
    },
    post: {
        ref: 'posts',
        type: mongoose.Schema.Types.ObjectId
    },
    conversation: {
        ref: 'conversation',
        type: mongoose.Schema.Types.ObjectId
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('notification', notificationSchema);
