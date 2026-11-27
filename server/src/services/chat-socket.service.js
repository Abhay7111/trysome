const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const conversationModel = require('../models/conversation.model');
const { areParticipantsEligibleById } = require('./chat-access.service');

function getTokenFromCookieHeader(header = '') {
    const tokenCookie = header.split(';').map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith('token='));
    if (!tokenCookie) return null;

    try {
        return decodeURIComponent(tokenCookie.slice('token='.length));
    } catch (error) {
        return null;
    }
}

function attachChatSocket(io) {
    const activeConversationUsers = new Map();

    io.revokeIneligibleChats = async (userIds) => {
        const conversations = await conversationModel.find({
            participants: { $all: userIds }
        }).select('participants');

        for (const conversation of conversations) {
            const participantIds = conversation.participants.map(String);
            if (await areParticipantsEligibleById(participantIds)) continue;

            const conversationId = String(conversation._id);
            const room = `conversation:${conversationId}`;
            io.to(room).emit('chat:access-revoked', { conversationId });
            const sockets = [...io.sockets.sockets.values()].filter(
                (socket) => socket.data.joinedConversations?.has(conversationId)
            );
            for (const socket of sockets) {
                leaveConversation(socket, conversationId);
                socket.leave(room);
            }
            activeConversationUsers.delete(conversationId);

            for (const participantId of participantIds) {
                io.to(`user:${participantId}`).emit('chat:access-revoked', {
                    conversationId
                });
            }
        }
    };

    function leaveConversation(socket, conversationId) {
        const joinedConversations = socket.data.joinedConversations;
        if (!joinedConversations?.delete(conversationId)) return;

        const roomUsers = activeConversationUsers.get(conversationId);
        const userSockets = roomUsers?.get(socket.data.userId);
        userSockets?.delete(socket.id);
        if (userSockets?.size === 0) {
            roomUsers.delete(socket.data.userId);
            socket.to(`conversation:${conversationId}`).emit('chat:user-presence', {
                conversationId,
                userId: socket.data.userId,
                online: false
            });
        }
        if (roomUsers?.size === 0) activeConversationUsers.delete(conversationId);
    }

    io.use((socket, next) => {
        const token = getTokenFromCookieHeader(socket.handshake.headers.cookie);
        if (!token) {
            return next(new Error('Unauthorized'));
        }

        try {
            const user = jwt.verify(token, process.env.JWT_SCRET);
            if (!user || typeof user !== 'object' || !user.id) {
                return next(new Error('Unauthorized'));
            }
            socket.data.userId = String(user.id);
            return next();
        } catch (error) {
            return next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        socket.data.joinedConversations = new Set();
        socket.join(`user:${userId}`);

        socket.on('chat:join', async (conversationId, acknowledge) => {
            if (!mongoose.Types.ObjectId.isValid(conversationId)) {
                acknowledge?.({ error: 'Invalid conversation id' });
                return;
            }

            try {
                const conversation = await conversationModel.findOne({
                    _id: conversationId,
                    participants: userId,
                    deletedFor: { $ne: userId }
                }).select('participants deletedFor');
                if (
                    !conversation
                    || !await areParticipantsEligibleById(conversation.participants)
                ) {
                    acknowledge?.({ error: 'Conversation not found' });
                    return;
                }

                const roomUsers = activeConversationUsers.get(conversationId) ?? new Map();
                const userSockets = roomUsers.get(userId) ?? new Set();
                const wasOffline = userSockets.size === 0;
                userSockets.add(socket.id);
                roomUsers.set(userId, userSockets);
                activeConversationUsers.set(conversationId, roomUsers);

                socket.data.joinedConversations.add(conversationId);
                socket.join(`conversation:${conversationId}`);
                acknowledge?.({
                    success: true,
                    onlineUserIds: [...roomUsers.keys()]
                });
                if (wasOffline) {
                    socket.to(`conversation:${conversationId}`).emit('chat:user-presence', {
                        conversationId,
                        userId,
                        online: true
                    });
                }
            } catch (error) {
                acknowledge?.({ error: 'Unable to join conversation' });
            }
        });

        socket.on('chat:leave', (conversationId) => {
            if (mongoose.Types.ObjectId.isValid(conversationId)) {
                leaveConversation(socket, conversationId);
                socket.leave(`conversation:${conversationId}`);
            }
        });

        socket.on('chat:typing', (payload = {}) => {
            const conversationId = payload?.conversationId;
            const isTyping = payload?.isTyping;
            if (
                typeof conversationId !== 'string'
                || !socket.data.joinedConversations.has(conversationId)
                || typeof isTyping !== 'boolean'
            ) {
                return;
            }
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId,
                isTyping
            });
        });

        socket.on('disconnecting', () => {
            for (const conversationId of [...socket.data.joinedConversations]) {
                leaveConversation(socket, conversationId);
            }
        });
    });
}

module.exports = attachChatSocket;
