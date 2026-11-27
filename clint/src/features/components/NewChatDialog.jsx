import { useState } from 'react';
import { RiCloseLine, RiGroupLine, RiSearchLine } from '@remixicon/react';
import { searchExplore } from '../services/explore.api';
import { createConversation } from '../services/chat.api';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

export default function NewChatDialog({ currentUserId, onClose, onCreated }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const selectedUsersEligible = selectedUsers.every(
    (user) => user.isFollowing && user.followsYou
  );

  const handleSearch = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters to search for users.');
      return;
    }

    setSearching(true);
    setError('');
    try {
      const result = await searchExplore('users', query.trim());
      setUsers((result.users ?? []).filter((user) => user.id !== String(currentUserId)));
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to search users.');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelection = (user) => {
    setSelectedUsers((current) => (
      current.some((selected) => selected.id === user.id)
        ? current.filter((selected) => selected.id !== user.id)
        : [...current, user]
    ));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!selectedUsers.length) {
      setError('Select at least one person to start a chat.');
      return;
    }
    if (selectedUsers.length > 1 && !groupName.trim()) {
      setError('Enter a name for the group chat.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const result = await createConversation(
        selectedUsers.map((user) => user.id),
        groupName.trim()
      );
      onCreated(result.conversation);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to create chat.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={style.modalBackdrop} onClick={onClose}>
      <section
        className={`${style.postModal} ${style.newChatDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={style.modalHeader}>
          <h2 id="new-chat-title">New chat</h2>
          <button type="button" onClick={onClose} aria-label="Close new chat">
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>
        <form className={style.chatUserSearch} onSubmit={handleSearch}>
          <RiSearchLine aria-hidden="true" />
          <input
            type="search"
            aria-label="Find people to chat with"
            placeholder="Search users by username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={searching || query.trim().length < 2}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        {selectedUsers.length > 1 && (
          <label className={style.groupNameInput}>
            <RiGroupLine aria-hidden="true" />
            <input
              type="text"
              maxLength={60}
              placeholder="Group name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
          </label>
        )}
        {error && <p className={style.errorBanner} role="alert">{error}</p>}
        <div className={style.chatUserResults}>
          {users.map((user) => {
            const selected = selectedUsers.some((item) => item.id === user.id);
            const canChat = user.isFollowing && user.followsYou;
            const status = canChat
              ? 'You both follow each other'
              : user.hasRequestedFollow
                ? 'Follow request pending'
                : user.isFollowing
                  ? 'Waiting for them to follow you'
                  : 'Both users must follow each other';
            return (
              <button
                type="button"
                key={user.id}
                className={selected ? style.selectedChatUser : ''}
                aria-pressed={selected}
                disabled={!canChat && !selected}
                onClick={() => toggleSelection(user)}
              >
                <Avatar user={user} />
                <span className={style.chatUserIdentity}>
                  <strong>@{user.username}</strong>
                  <small>{status}</small>
                </span>
                {selected && <span className={style.selectedCheck}>Selected</span>}
              </button>
            );
          })}
          {query.length >= 2 && !searching && !users.length && (
            <p className={style.chatEmpty}>No users found.</p>
          )}
        </div>
        <footer className={style.chatDialogFooter}>
          <span>
            {selectedUsers.length
              ? `${selectedUsers.length} selected`
              : 'Both users must follow each other before chatting'}
          </span>
          <button
            type="button"
            disabled={creating || !selectedUsers.length || !selectedUsersEligible}
            onClick={handleCreate}
          >
            {creating ? 'Starting...' : selectedUsers.length > 1 ? 'Create group' : 'Start chat'}
          </button>
        </footer>
      </section>
    </div>
  );
}
