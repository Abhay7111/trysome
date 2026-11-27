import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSocial } from '../social/useSocial';
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from '../services/chat.api';
import useChatSocket from '../hooks/useChatSocket';
import ChatInbox from '../components/ChatInbox';
import ChatWindow from '../components/ChatWindow';
import NewChatDialog from '../components/NewChatDialog';
import style from './Social.module.scss';

function appendUniqueMessage(messages, message) {
  if (messages.some((current) => current._id === message._id)) return messages;
  return [...messages, message];
}

export default function ChatPage() {
  const { profile } = useSocial();
  const { socket, error: connectionError } = useChatSocket();
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadedConversationId, setLoadedConversationId] = useState(null);
  const [messageError, setMessageError] = useState({ conversationId: null, text: '' });
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [presence, setPresence] = useState({
    conversationId: null,
    onlineUserIds: [],
    typingUserIds: [],
  });

  const selectedConversation = useMemo(
    () => conversations.find(
      (conversation) => conversation._id === selectedConversationId
    ) ?? null,
    [conversations, selectedConversationId]
  );
  const visibleMessages = loadedConversationId === selectedConversationId
    ? messages
    : [];
  const visibleMessageError = messageError.conversationId === selectedConversationId
    ? messageError.text
    : '';
  const onlineUserIds = presence.conversationId === selectedConversationId
    ? presence.onlineUserIds
    : [];
  const typingUserIds = presence.conversationId === selectedConversationId
    ? presence.typingUserIds
    : [];

  const refreshConversations = useCallback(async () => {
    const result = await fetchConversations();
    setConversations(result.conversations ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    fetchConversations()
      .then((result) => {
        if (active) setConversations(result.conversations ?? []);
      })
      .catch((requestError) => {
        if (active) {
          setListError(
            requestError.response?.data?.message ?? 'Unable to load conversations.'
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingConversations(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const refreshOnChatUpdate = () => {
      refreshConversations()
        .then(() => setListError(''))
        .catch((requestError) => {
          setListError(
            requestError.response?.data?.message ?? 'Unable to refresh conversations.'
          );
        });
    };
    const handleAccessRevoked = ({ conversationId }) => {
      setConversations((current) => current.filter(
        (conversation) => conversation._id !== conversationId
      ));
      if (conversationId === selectedConversationId) {
        setSelectedConversationId(null);
        setMessages([]);
        setLoadedConversationId(null);
        setListError('This chat is unavailable because you no longer follow each other.');
      }
    };
    socket.on('chat:conversation-updated', refreshOnChatUpdate);
    socket.on('chat:conversation-created', refreshOnChatUpdate);
    socket.on('chat:access-revoked', handleAccessRevoked);
    return () => {
      socket.off('chat:conversation-updated', refreshOnChatUpdate);
      socket.off('chat:conversation-created', refreshOnChatUpdate);
      socket.off('chat:access-revoked', handleAccessRevoked);
    };
  }, [refreshConversations, selectedConversationId, socket]);

  useEffect(() => {
    if (!selectedConversationId) return undefined;
    let active = true;
    fetchMessages(selectedConversationId)
      .then(async (result) => {
        if (!active) return;
        setMessages(result.messages ?? []);
        setLoadedConversationId(selectedConversationId);
        try {
          await markConversationRead(selectedConversationId);
          if (!active) return;
          setMessages((current) => current.map((message) => ({
            ...message,
            readBy: message.readBy.includes(String(profile.id))
              ? message.readBy
              : [...message.readBy, String(profile.id)],
          })));
          setConversations((current) => current.map((conversation) => (
            conversation._id === selectedConversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )));
        } catch (requestError) {
          if (active) {
            setMessageError({
              conversationId: selectedConversationId,
              text: requestError.response?.data?.message ?? 'Unable to mark messages as read.',
            });
          }
        }
      })
      .catch((requestError) => {
        if (active) {
          setMessageError({
            conversationId: selectedConversationId,
            text: requestError.response?.data?.message ?? 'Unable to load messages.',
          });
          setLoadedConversationId(selectedConversationId);
        }
      });
    return () => {
      active = false;
    };
  }, [profile.id, selectedConversationId]);

  useEffect(() => {
    if (!socket || !selectedConversationId) return undefined;

    const conversationId = selectedConversationId;
    const joinConversation = () => {
      socket.emit('chat:join', conversationId, (result) => {
        if (result?.error) {
          setMessageError({ conversationId, text: result.error });
          return;
        }
        setPresence({
          conversationId,
          onlineUserIds: (result?.onlineUserIds ?? []).filter(
            (userId) => userId !== String(profile.id)
          ),
          typingUserIds: [],
        });
      });
    };
    const handleMessage = (message) => {
      if (message.conversation !== conversationId) return;
      setMessages((current) => appendUniqueMessage(current, message));
    };
    const handleRead = (event) => {
      if (event.conversationId !== conversationId) return;
      setMessages((current) => current.map((message) => ({
        ...message,
        readBy: message.readBy.includes(event.userId)
          ? message.readBy
          : [...message.readBy, event.userId],
      })));
    };

    const handleConversationUpdate = (event) => {
      if (event.conversationId === conversationId) {
        setMessages((current) => appendUniqueMessage(current, event.message));
        markConversationRead(conversationId)
          .then(() => setConversations((current) => current.map((conversation) => (
            conversation._id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          ))))
          .catch((requestError) => {
            setMessageError({
              conversationId,
              text: requestError.response?.data?.message ?? 'Unable to mark message as read.',
            });
          });
      }
    };
    const handleConversationRead = (event) => {
      if (event.userId === String(profile.id)) {
        setConversations((current) => current.map((conversation) => (
          conversation._id === event.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )));
      }
    };
    const handlePresence = (event) => {
      if (event.conversationId !== conversationId) return;
      setPresence((current) => {
        const onlineIds = current.conversationId === conversationId
          ? current.onlineUserIds
          : [];
        return {
          ...current,
          conversationId,
          onlineUserIds: event.online
            ? [...new Set([...onlineIds, event.userId])]
            : onlineIds.filter((userId) => userId !== event.userId),
        };
      });
    };
    const handleTyping = (event) => {
      if (event.conversationId !== conversationId || event.userId === String(profile.id)) return;
      setPresence((current) => {
        const typingIds = current.conversationId === conversationId
          ? current.typingUserIds
          : [];
        return {
          ...current,
          conversationId,
          typingUserIds: event.isTyping
            ? [...new Set([...typingIds, event.userId])]
            : typingIds.filter((userId) => userId !== event.userId),
        };
      });
    };

    if (socket.connected) joinConversation();
    socket.on('connect', joinConversation);
    socket.on('chat:message', handleMessage);
    socket.on('chat:read', handleRead);
    socket.on('chat:conversation-updated', handleConversationUpdate);
    socket.on('chat:conversation-read', handleConversationRead);
    socket.on('chat:user-presence', handlePresence);
    socket.on('chat:typing', handleTyping);
    return () => {
      socket.emit('chat:leave', conversationId);
      socket.off('connect', joinConversation);
      socket.off('chat:message', handleMessage);
      socket.off('chat:read', handleRead);
      socket.off('chat:conversation-updated', handleConversationUpdate);
      socket.off('chat:conversation-read', handleConversationRead);
      socket.off('chat:user-presence', handlePresence);
      socket.off('chat:typing', handleTyping);
    };
  }, [profile.id, selectedConversationId, socket]);

  const handleSend = async (text, file) => {
    if (!selectedConversationId) return false;
    setSending(true);
    setMessageError({ conversationId: null, text: '' });
    try {
      const result = await sendMessage(selectedConversationId, text, file);
      setMessages((current) => appendUniqueMessage(current, result.message));
      setLoadedConversationId(selectedConversationId);
      setConversations((current) => current.map((conversation) => (
        conversation._id === selectedConversationId
          ? {
            ...conversation,
            lastMessage: result.message,
            lastMessageAt: result.message.createdAt,
            unreadCount: 0,
          }
          : conversation
      )).sort((left, right) => (
        new Date(right.lastMessageAt) - new Date(left.lastMessageAt)
      )));
      return true;
    } catch (requestError) {
      setMessageError({
        conversationId: selectedConversationId,
        text: requestError.response?.data?.message ?? 'Unable to send message.',
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleConversationCreated = (conversation) => {
    setConversations((current) => [
      conversation,
      ...current.filter((item) => item._id !== conversation._id),
    ]);
    setSelectedConversationId(conversation._id);
    setShowNewChat(false);
    setListError('');
    refreshConversations().catch((requestError) => {
      setListError(
        requestError.response?.data?.message ?? 'Unable to refresh conversations.'
      );
    });
  };

  return (
    <>
      <header className={style.header}><h1>Chats</h1></header>
      {listError && <p className={style.errorBanner} role="alert">{listError}</p>}
      <section className={`${style.chatPage} ${selectedConversation ? style.chatPageWithSelection : ''}`}>
        <ChatInbox
          conversations={conversations}
          currentUserId={profile.id}
          selectedConversationId={selectedConversationId}
          loading={isLoadingConversations}
          onSelect={setSelectedConversationId}
          onNewChat={() => setShowNewChat(true)}
        />
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={visibleMessages}
            onlineUserIds={onlineUserIds}
            typingUserIds={typingUserIds}
            loading={loadedConversationId !== selectedConversationId}
            sending={sending}
            connectionError={connectionError}
            error={visibleMessageError}
            onBack={() => setSelectedConversationId(null)}
            onTyping={(isTyping) => socket?.emit('chat:typing', {
              conversationId: selectedConversationId,
              isTyping,
            })}
            onSend={handleSend}
          />
        ) : (
          <section className={style.chatEmptyPane}>
            <h2>Select a conversation</h2>
            <p>Choose an existing chat or start a new one.</p>
          </section>
        )}
      </section>
      {showNewChat && (
        <NewChatDialog
          currentUserId={profile.id}
          onClose={() => setShowNewChat(false)}
          onCreated={handleConversationCreated}
        />
      )}
    </>
  );
}
