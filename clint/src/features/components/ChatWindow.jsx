import { useEffect, useRef, useState } from 'react';
import {
  RiArrowLeftLine,
  RiAttachmentLine,
  RiFileTextLine,
  RiSendPlaneFill,
} from '@remixicon/react';
import { useSocial } from '../social/useSocial';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

function getTitle(conversation, currentUserId) {
  if (conversation.isGroup) return conversation.groupName || 'Group chat';
  return conversation.participants.find(
    (participant) => participant.id !== String(currentUserId)
  )?.username ?? 'Conversation';
}

function getReadLabel(message, conversation, currentUserId) {
  if (message.sender.id !== String(currentUserId)) return '';
  const readCount = message.readBy.filter((userId) => (
    userId !== String(currentUserId)
  )).length;
  if (!readCount) return 'Sent';
  return conversation.isGroup ? `Seen by ${readCount}` : 'Seen';
}

export default function ChatWindow({
  conversation,
  messages,
  onlineUserIds,
  typingUserIds,
  loading,
  sending,
  connectionError,
  error,
  onBack,
  onTyping,
  onSend,
}) {
  const { profile } = useSocial();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const fileInput = useRef(null);
  const endOfMessages = useRef(null);
  const typingTimer = useRef(null);
  const title = getTitle(conversation, profile.id);
  const otherParticipant = conversation.participants.find(
    (participant) => participant.id !== String(profile.id)
  );
  const typingNames = conversation.participants
    .filter((participant) => typingUserIds.includes(participant.id))
    .map((participant) => participant.username);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const handleTextChange = (event) => {
    const nextText = event.target.value;
    setText(nextText);
    onTyping(Boolean(nextText.trim()));
    clearTimeout(typingTimer.current);
    if (nextText.trim()) {
      typingTimer.current = setTimeout(() => onTyping(false), 1200);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim() && !file) return;
    const sent = await onSend(text.trim(), file);
    if (sent) {
      clearTimeout(typingTimer.current);
      onTyping(false);
      setText('');
      setFile(null);
      setFileError('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleComposerKeyDown = (event) => {
    if (
      event.key !== 'Enter'
      || event.shiftKey
      || event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (!sending && (text.trim() || file)) {
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleFile = (event) => {
    const selected = event.target.files?.[0] ?? null;
    if (selected && selected.size > 10 * 1024 * 1024) {
      setFile(null);
      setFileError('Choose a file smaller than 10 MB.');
      event.target.value = '';
      return;
    }
    setFileError('');
    setFile(selected);
  };

  return (
    <section className={style.chatWindow}>
      <header className={style.chatWindowHeader}>
        <button
          type="button"
          className={style.mobileChatBack}
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <RiArrowLeftLine aria-hidden="true" />
        </button>
        {conversation.isGroup
          ? <span className={style.groupAvatar}>{conversation.groupName?.charAt(0) || 'G'}</span>
          : <Avatar user={conversation.participants.find(
            (participant) => participant.id !== String(profile.id)
          )} />}
        <div>
          <h2>{title}</h2>
          {conversation.isGroup
            ? <span>{conversation.participants.length} members</span>
            : <span>{onlineUserIds.includes(otherParticipant?.id) ? 'Active now' : 'Offline'}</span>}
        </div>
      </header>
      <div className={style.chatMessages}>
        {loading && <p className={style.chatEmpty}>Loading messages...</p>}
        {!loading && !messages.length && (
          <p className={style.chatEmpty}>Send a message to get started.</p>
        )}
        {messages.map((message) => {
          const mine = message.sender.id === String(profile.id);
          return (
            <article
              className={`${style.chatMessage} ${mine ? style.ownMessage : ''}`}
              key={message._id}
            >
              {!mine && <Avatar user={message.sender} className={style.messageAvatar} />}
              <div className={style.messageBubble}>
                {!mine && conversation.isGroup && (
                  <strong className={style.messageSender}>{message.sender.username}</strong>
                )}
                {message.text && <p>{message.text}</p>}
                {message.attachment?.url && (
                  <a
                    className={style.messageAttachment}
                    href={message.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {message.attachment.mimeType?.startsWith('image/')
                      ? <img src={message.attachment.url} alt={message.attachment.name} />
                      : <RiFileTextLine aria-hidden="true" />}
                    <span>{message.attachment.name}</span>
                  </a>
                )}
                <div className={style.messageMeta}>
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                  {mine && <span>{getReadLabel(message, conversation, profile.id)}</span>}
                </div>
              </div>
            </article>
          );
        })}
        <div ref={endOfMessages} />
      </div>
      {typingNames.length > 0 && (
        <p className={style.chatTyping} aria-live="polite">
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
        </p>
      )}
      {(connectionError || error || fileError) && (
        <p className={style.chatError} role="alert">
          {fileError || error || connectionError}
        </p>
      )}
      {file && <p className={style.selectedAttachment}>Attached: {file.name}</p>}
      <form className={style.chatComposer} onSubmit={handleSubmit}>
        <label className={style.attachButton} aria-label="Attach a file">
          <RiAttachmentLine aria-hidden="true" />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf,text/plain"
            onChange={handleFile}
          />
        </label>
        <textarea
          aria-label="Write a message"
          placeholder="Write a message..."
          value={text}
          maxLength={4000}
          rows={1}
          onChange={handleTextChange}
          onKeyDown={handleComposerKeyDown}
        />
        <button type="submit" aria-label="Send message" disabled={sending || (!text.trim() && !file)}>
          <RiSendPlaneFill aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
