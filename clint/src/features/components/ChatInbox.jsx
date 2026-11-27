import { RiAddLine } from '@remixicon/react';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

function getConversationTitle(conversation, currentUserId) {
  if (conversation.isGroup) return conversation.groupName || 'Group chat';
  return conversation.participants.find(
    (participant) => participant.id !== String(currentUserId)
  )?.username ?? 'Conversation';
}

function getLastMessageText(message) {
  if (!message) return 'Start the conversation';
  if (message.text) return message.text;
  return message.attachment?.name ?? 'Attachment';
}

export default function ChatInbox({
  conversations,
  currentUserId,
  selectedConversationId,
  loading,
  onSelect,
  onNewChat,
}) {
  return (
    <aside className={style.chatInbox}>
      <header className={style.chatInboxHeader}>
        <h1>Messages</h1>
        <button type="button" onClick={onNewChat} aria-label="Start a new chat">
          <RiAddLine aria-hidden="true" />
        </button>
      </header>
      {loading && <p className={style.chatEmpty}>Loading conversations...</p>}
      {!loading && !conversations.length && (
        <p className={style.chatEmpty}>No chats yet. Start a conversation.</p>
      )}
      <div className={style.conversationList}>
        {conversations.map((conversation) => {
          const otherParticipant = conversation.participants.find(
            (participant) => participant.id !== String(currentUserId)
          );
          const title = getConversationTitle(conversation, currentUserId);
          const isSelected = conversation._id === selectedConversationId;
          return (
            <button
              type="button"
              className={`${style.conversationItem} ${isSelected ? style.activeConversation : ''}`}
              key={conversation._id}
              onClick={() => onSelect(conversation._id)}
            >
              {conversation.isGroup
                ? <span className={style.groupAvatar}>{conversation.groupName?.charAt(0) || 'G'}</span>
                : <Avatar user={otherParticipant} />}
              <span className={style.conversationInfo}>
                <strong>{title}</strong>
                <span>{getLastMessageText(conversation.lastMessage)}</span>
              </span>
              {conversation.unreadCount > 0 && (
                <span className={style.unreadBadge}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
