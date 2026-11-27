import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { searchExplore } from '../services/explore.api';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

const mentionPattern = /(^|[\s([{])@([A-Za-z0-9_.-]*)$/;

const MentionInput = forwardRef(function MentionInput({
  multiline = false,
  value,
  onChange,
  currentUserId,
  onKeyDown,
  ...fieldProps
}, forwardedRef) {
  const inputRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useImperativeHandle(forwardedRef, () => inputRef.current, []);

  useEffect(() => {
    if (!mentionQuery) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      searchExplore('users', mentionQuery)
        .then((result) => {
          if (!active) return;
          setUsers((result.users ?? []).filter((user) => (
            user.id !== String(currentUserId)
            && /^[A-Za-z0-9_.-]+$/.test(user.username)
          )));
          setSearchError('');
        })
        .catch((requestError) => {
          if (active) {
            setUsers([]);
            setSearchError(
              requestError.response?.data?.message ?? 'Unable to find users.'
            );
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentUserId, mentionQuery]);

  const updateMentionQuery = (text, cursorPosition) => {
    const match = text.slice(0, cursorPosition).match(mentionPattern);
    const query = match?.[2] ?? '';
    setMentionQuery(query.length >= 2 ? query : null);
    setUsers([]);
    setSearchError('');
    setSearching(query.length >= 2);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    updateMentionQuery(nextValue, event.target.selectionStart);
  };

  const selectUser = (user) => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPosition = input.selectionStart;
    const match = value.slice(0, cursorPosition).match(mentionPattern);
    if (!match) return;

    const tokenStart = match.index + match[1].length;
    const nextValue = `${value.slice(0, tokenStart)}@${user.username} ${value.slice(cursorPosition)}`;
    const nextCursor = tokenStart + user.username.length + 2;
    onChange(nextValue);
    setMentionQuery(null);
    setUsers([]);
    setSearching(false);
    setSearchError('');
    requestAnimationFrame(() => input.setSelectionRange(nextCursor, nextCursor));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && mentionQuery) {
      setMentionQuery(null);
      setUsers([]);
      setSearching(false);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && users.length) {
      event.preventDefault();
      selectUser(users[0]);
      return;
    }
    onKeyDown?.(event);
  };

  const inputProps = {
    ...fieldProps,
    ref: inputRef,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
  };

  return (
    <div className={style.mentionInput}>
      {multiline
        ? <textarea {...inputProps} />
        : <input {...inputProps} />}
      {mentionQuery && (
        <div className={style.mentionSuggestions} role="listbox" aria-label="Mention suggestions">
          {searching && <p>Searching users...</p>}
          {searchError && <p role="alert">{searchError}</p>}
          {!searching && !searchError && users.map((user) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={user.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectUser(user)}
            >
              <Avatar user={user} />
              <span>@{user.username}</span>
            </button>
          ))}
          {!searching && !searchError && !users.length && (
            <p>No public users found.</p>
          )}
        </div>
      )}
    </div>
  );
});

export default MentionInput;
