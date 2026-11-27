const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

const chatRoute = express.Router();
const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'application/pdf',
    'text/plain'
]);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes.has(file.mimetype)) {
            return callback(new Error('Attach an image, PDF, or plain text file'));
        }
        return callback(null, true);
    }
});
const handleUploadError = (error, req, res, next) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
};

chatRoute.get('/conversations', authenticate, chatController.listConversationsController);
chatRoute.post('/conversations', authenticate, chatController.createConversationController);
chatRoute.get(
    '/conversations/:conversationId/messages',
    authenticate,
    chatController.listMessagesController
);
chatRoute.post(
    '/conversations/:conversationId/messages',
    authenticate,
    upload.single('attachment'),
    handleUploadError,
    chatController.createMessageController
);
chatRoute.delete(
    '/conversations/:conversationId/messages',
    authenticate,
    chatController.deleteAllMyMessagesController
);
chatRoute.delete(
    '/conversations/:conversationId/messages/:messageId',
    authenticate,
    chatController.deleteMessageController
);
chatRoute.delete(
    '/conversations/:conversationId',
    authenticate,
    chatController.deleteConversationController
);
chatRoute.patch(
    '/conversations/:conversationId/read',
    authenticate,
    chatController.markConversationReadController
);

module.exports = chatRoute;
