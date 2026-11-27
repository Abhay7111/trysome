const mongoose = require('mongoose');
const chatMessageModel = require('../models/chatMessage.model');
const conversationModel = require('../models/conversation.model');
const userModel = require('../models/user.model');
const uploadImage = require('../services/imagekit.service');
const { createNotifications } = require('../services/notification.service');
const {
    areParticipantsEligibleById,
    filterEligibleConversations
} = require('../services/chat-access.service');

function isConversationParticipant(conversation, userId) {
    return conversation.participants.some((participantId) => (
        String(participantId._id ?? participantId) === String(userId)
    ));
}

function serializeMessage(message) {
    return {
        _id: String(message._id),
        conversation: String(message.conversation),
        sender: message.sender?._id
            ? {
                id: String(message.sender._id),
                username: message.sender.username,
                profile_img: message.sender.profile_img
            }
            : { id: String(message.sender) },
        text: message.text,
        attachment: message.attachment?.url ? message.attachment : null,
        readBy: (message.readBy ?? []).map(String),
        createdAt: message.createdAt
    };
}

function serializeConversation(conversation, unreadCount = 0) {
    return {
        _id: String(conversation._id),
        participants: (conversation.participants ?? []).map((participant) => ({
            id: String(participant._id),
            username: participant.username,
            profile_img: participant.profile_img
        })),
        isGroup: conversation.isGroup,
        groupName: conversation.groupName,
        lastMessage: conversation.lastMessage
            ? serializeMessage(conversation.lastMessage)
            : null,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount
    };
}

async function createConversationController(req, res) {
    const requestedIds = req.body?.participantIds;
    const groupName = String(req.body?.groupName ?? '').trim();
    if (!Array.isArray(requestedIds) || requestedIds.length < 1 || requestedIds.length > 19) {
        return res.status(400).json({ message: 'Choose between 1 and 19 other users' });
    }
    if (requestedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ message: 'One or more user ids are invalid' });
    }

    const uniqueIds = [...new Set(requestedIds.map(String))];
    if (uniqueIds.length !== requestedIds.length || uniqueIds.includes(String(req.user.id))) {
        return res.status(400).json({ message: 'Choose unique users other than yourself' });
    }
    const isGroup = uniqueIds.length > 1;
    if (isGroup && (!groupName || groupName.length > 60)) {
        return res.status(400).json({ message: 'Group name must be between 1 and 60 characters' });
    }

    try {
        const participants = [String(req.user.id), ...uniqueIds];
        const foundUsers = await userModel.countDocuments({ _id: { $in: uniqueIds } });
        if (foundUsers !== uniqueIds.length) {
            return res.status(404).json({ message: 'One or more users were not found' });
        }
        if (!await areParticipantsEligibleById(participants)) {
            return res.status(403).json({
                message: 'All chat participants must follow each other before chatting'
            });
        }

        if (!isGroup) {
            const directKey = [...participants].sort().join(':');
            const existing = await conversationModel.findOneAndUpdate(
                { directKey },
                { $pull: { deletedFor: req.user.id } },
                { new: true }
            )
                .populate('participants', 'username profile_img')
                .populate({
                    path: 'lastMessage',
                    populate: { path: 'sender', select: 'username profile_img' }
                });
            if (existing) {
                return res.status(200).json({
                    conversation: serializeConversation(existing)
                });
            }
        }

        const conversation = await conversationModel.create({
            participants,
            isGroup,
            groupName: isGroup ? groupName : '',
            createdBy: req.user.id,
            directKey: isGroup ? undefined : [...participants].sort().join(':')
        });
        const populated = await conversationModel.findById(conversation._id)
            .populate('participants', 'username profile_img');
        const io = req.app.get('io');
        if (io) {
            for (const participantId of participants) {
                if (String(participantId) !== String(req.user.id)) {
                    io.to(`user:${participantId}`).emit('chat:conversation-created', {
                        conversationId: String(conversation._id)
                    });
                }
            }
        }
        return res.status(201).json({
            conversation: serializeConversation(populated)
        });
    } catch (error) {
        if (error.code === 11000 && uniqueIds.length === 1) {
            try {
                const directKey = [String(req.user.id), ...uniqueIds].sort().join(':');
                const existing = await conversationModel.findOneAndUpdate(
                    { directKey },
                    { $pull: { deletedFor: req.user.id } },
                    { new: true }
                )
                    .populate('participants', 'username profile_img');
                if (existing) {
                    return res.status(200).json({
                        conversation: serializeConversation(existing)
                    });
                }
            } catch (lookupError) {
                return res.status(500).json({ message: 'Unable to open conversation' });
            }
        }
        return res.status(500).json({ message: 'Unable to create conversation' });
    }
}

async function listConversationsController(req, res) {
    try {
        const foundConversations = await conversationModel.find({
            participants: req.user.id,
            deletedFor: { $ne: req.user.id }
        })
            .populate('participants', 'username profile_img')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'username profile_img' }
            })
            .sort({ lastMessageAt: -1 });
        const conversations = await filterEligibleConversations(foundConversations);

        if (!conversations.length) {
            return res.status(200).json({ conversations: [] });
        }

        const conversationIds = conversations.map(({ _id }) => _id);
        const unreadRows = await chatMessageModel.aggregate([
            {
                $match: {
                    conversation: { $in: conversationIds },
                    sender: { $ne: new mongoose.Types.ObjectId(req.user.id) },
                    readBy: { $ne: new mongoose.Types.ObjectId(req.user.id) }
                }
            },
            { $group: { _id: '$conversation', count: { $sum: 1 } } }
        ]);
        const unreadCounts = new Map(
            unreadRows.map(({ _id, count }) => [String(_id), count])
        );

        return res.status(200).json({
            conversations: conversations.map((conversation) => (
                serializeConversation(
                    conversation,
                    unreadCounts.get(String(conversation._id)) ?? 0
                )
            ))
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load conversations' });
    }
}

async function listMessagesController(req, res) {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
    }

    try {
        const conversation = await conversationModel.findById(conversationId)
            .select('participants deletedFor');
        if (
            !conversation
            || !isConversationParticipant(conversation, req.user.id)
            || (conversation.deletedFor ?? []).some(
                (userId) => String(userId) === String(req.user.id)
            )
            || !await areParticipantsEligibleById(conversation.participants)
        ) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const messages = await chatMessageModel.find({ conversation: conversationId })
            .populate('sender', 'username profile_img')
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({
            messages: messages.reverse().map(serializeMessage)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load messages' });
    }
}

async function createMessageController(req, res) {
    const { conversationId } = req.params;
    const text = String(req.body?.text ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
    }
    if (text.length > 4000) {
        return res.status(400).json({ message: 'Messages must be 4000 characters or fewer' });
    }
    if (!text && !req.file) {
        return res.status(400).json({ message: 'Enter a message or attach a file' });
    }

    try {
        const conversation = await conversationModel.findById(conversationId)
            .select('participants deletedFor');
        if (
            !conversation
            || !isConversationParticipant(conversation, req.user.id)
            || (conversation.deletedFor ?? []).some(
                (userId) => String(userId) === String(req.user.id)
            )
            || !await areParticipantsEligibleById(conversation.participants)
        ) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        let attachment;
        if (req.file) {
            const safeName = req.file.originalname
                .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
                .slice(0, 180) || 'attachment';
            const url = await uploadImage(
                req.file.buffer,
                `${Date.now()}-${safeName}`,
                'Tweet-clone/chats'
            );
            attachment = {
                url,
                name: safeName,
                mimeType: req.file.mimetype,
                size: req.file.size
            };
        }

        const created = await chatMessageModel.create({
            conversation: conversationId,
            sender: req.user.id,
            text,
            attachment,
            readBy: [req.user.id]
        });
        await conversationModel.updateOne(
            { _id: conversationId },
            {
                $set: {
                    lastMessage: created._id,
                    lastMessageAt: created.createdAt,
                    deletedFor: []
                }
            }
        );
        const message = await chatMessageModel.findById(created._id)
            .populate('sender', 'username profile_img');
        const serialized = serializeMessage(message);
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('chat:message', serialized);
            for (const participantId of conversation.participants) {
                if (String(participantId) !== String(req.user.id)) {
                    io.to(`user:${participantId}`).emit('chat:conversation-updated', {
                        conversationId: String(conversationId),
                        message: serialized
                    });
                }
            }
        }
        try {
            await createNotifications(
                conversation.participants
                    .filter((participantId) => String(participantId) !== String(req.user.id))
                    .map((participantId) => ({
                        recipient: participantId,
                        actor: req.user.id,
                        type: 'message',
                        conversation: conversation._id
                    })),
                io
            );
        } catch (notificationError) {
            console.error('Unable to create message notifications', notificationError);
        }

        return res.status(201).json({ message: serialized });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to send message' });
    }
}

async function deleteMessageController(req, res) {
    const { conversationId, messageId } = req.params;
    if (
        !mongoose.Types.ObjectId.isValid(conversationId)
        || !mongoose.Types.ObjectId.isValid(messageId)
    ) {
        return res.status(400).json({ message: 'Invalid conversation or message id' });
    }

    try {
        const conversation = await conversationModel.findById(conversationId)
            .select('participants deletedFor createdAt lastMessage');
        if (
            !conversation
            || !isConversationParticipant(conversation, req.user.id)
            || (conversation.deletedFor ?? []).some(
                (userId) => String(userId) === String(req.user.id)
            )
            || !await areParticipantsEligibleById(conversation.participants)
        ) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const message = await chatMessageModel.findOne({
            _id: messageId,
            conversation: conversationId
        }).select('sender');
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (String(message.sender) !== String(req.user.id)) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }

        const deletion = await chatMessageModel.deleteOne({
            _id: messageId,
            conversation: conversationId,
            sender: req.user.id
        });
        if (!deletion.deletedCount) {
            return res.status(404).json({ message: 'Message not found' });
        }

        let lastMessage;
        let lastMessageAt = conversation.lastMessageAt;
        const lastMessageChanged = (
            String(conversation.lastMessage ?? '') === String(messageId)
        );
        if (lastMessageChanged) {
            lastMessage = await chatMessageModel.findOne({ conversation: conversationId })
                .populate('sender', 'username profile_img')
                .sort({ createdAt: -1 });
            lastMessageAt = lastMessage?.createdAt ?? conversation.createdAt;
            await conversationModel.updateOne(
                { _id: conversationId, lastMessage: messageId },
                {
                    $set: {
                        lastMessage: lastMessage?._id ?? null,
                        lastMessageAt
                    }
                }
            );
        }

        const io = req.app.get('io');
        const event = {
            conversationId: String(conversationId),
            deletedMessageId: String(messageId),
            lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
            lastMessageAt,
            lastMessageChanged
        };
        if (io) {
            for (const participantId of conversation.participants) {
                io.to(`user:${participantId}`).emit('chat:conversation-updated', event);
            }
        }

        return res.status(200).json({
            deleted: true,
            messageId: String(messageId),
            lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
            lastMessageAt,
            lastMessageChanged
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete message' });
    }
}

async function deleteAllMyMessagesController(req, res) {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
    }

    try {
        const conversation = await conversationModel.findById(conversationId)
            .select('participants deletedFor createdAt lastMessage');
        if (
            !conversation
            || !isConversationParticipant(conversation, req.user.id)
            || (conversation.deletedFor ?? []).some(
                (userId) => String(userId) === String(req.user.id)
            )
            || !await areParticipantsEligibleById(conversation.participants)
        ) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const lastMessageIsMine = conversation.lastMessage
            ? await chatMessageModel.exists({
                _id: conversation.lastMessage,
                conversation: conversationId,
                sender: req.user.id
            })
            : false;
        const deletion = await chatMessageModel.deleteMany({
            conversation: conversationId,
            sender: req.user.id
        });
        if (!deletion.deletedCount) {
            return res.status(200).json({
                deletedCount: 0,
                lastMessage: null,
                lastMessageAt: conversation.lastMessageAt,
                lastMessageChanged: false
            });
        }

        let lastMessage;
        let lastMessageAt = conversation.lastMessageAt;
        if (lastMessageIsMine) {
            lastMessage = await chatMessageModel.findOne({ conversation: conversationId })
                .populate('sender', 'username profile_img')
                .sort({ createdAt: -1 });
            lastMessageAt = lastMessage?.createdAt ?? conversation.createdAt;
            await conversationModel.updateOne(
                { _id: conversationId, lastMessage: conversation.lastMessage },
                {
                    $set: {
                        lastMessage: lastMessage?._id ?? null,
                        lastMessageAt
                    }
                }
            );
        }

        const io = req.app.get('io');
        const event = {
            conversationId: String(conversationId),
            deletedSenderId: String(req.user.id),
            lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
            lastMessageAt,
            lastMessageChanged: Boolean(lastMessageIsMine)
        };
        if (io) {
            for (const participantId of conversation.participants) {
                io.to(`user:${participantId}`).emit('chat:conversation-updated', event);
            }
        }

        return res.status(200).json({
            deletedCount: deletion.deletedCount,
            lastMessage: event.lastMessage,
            lastMessageAt,
            lastMessageChanged: event.lastMessageChanged
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete your messages' });
    }
}

async function markConversationReadController(req, res) {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
    }

    try {
        const conversation = await conversationModel.findById(conversationId)
            .select('participants deletedFor');
        if (
            !conversation
            || !isConversationParticipant(conversation, req.user.id)
            || (conversation.deletedFor ?? []).some(
                (userId) => String(userId) === String(req.user.id)
            )
            || !await areParticipantsEligibleById(conversation.participants)
        ) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const result = await chatMessageModel.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: req.user.id },
                readBy: { $ne: req.user.id }
            },
            { $addToSet: { readBy: req.user.id } }
        );
        const event = {
            conversationId: String(conversationId),
            userId: String(req.user.id),
            readAt: new Date().toISOString()
        };
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('chat:read', event);
            for (const participantId of conversation.participants) {
                if (String(participantId) !== String(req.user.id)) {
                    io.to(`user:${participantId}`).emit('chat:conversation-read', event);
                }
            }
        }
        return res.status(200).json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to mark messages as read' });
    }
}

async function deleteConversationController(req, res) {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
    }

    try {
        const conversation = await conversationModel.findOneAndUpdate(
            { _id: conversationId, participants: req.user.id },
            { $addToSet: { deletedFor: req.user.id } },
            { new: true }
        ).select('_id');
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        req.app.get('io')?.to(`user:${req.user.id}`).emit('chat:conversation-deleted', {
            conversationId: String(conversation._id)
        });
        return res.status(200).json({ deleted: true });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete conversation' });
    }
}

module.exports = {
    createConversationController,
    listConversationsController,
    listMessagesController,
    createMessageController,
    deleteMessageController,
    deleteAllMyMessagesController,
    markConversationReadController,
    deleteConversationController
};
