const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    deletedFor: [{
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        trim: true,
        maxlength: 60,
        default: ''
    },
    createdBy: {
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    directKey: {
        type: String,
        unique: true,
        sparse: true
    },
    lastMessage: {
        ref: 'chatMessage',
        type: mongoose.Schema.Types.ObjectId
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('conversation', conversationSchema);
