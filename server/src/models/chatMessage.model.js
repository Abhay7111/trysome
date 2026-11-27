const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    conversation: {
        ref: 'conversation',
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    sender: {
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    text: {
        type: String,
        maxlength: 4000,
        default: ''
    },
    attachment: {
        url: { type: String },
        name: { type: String },
        mimeType: { type: String },
        size: { type: Number }
    },
    readBy: [{
        ref: 'user',
        type: mongoose.Schema.Types.ObjectId
    }]
}, { timestamps: true });

module.exports = mongoose.model('chatMessage', chatMessageSchema);
