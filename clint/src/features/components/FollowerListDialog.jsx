import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchFollowers, fetchFollowing } from '../services/users.api';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

export default function FollowerListDialog({
  userId,
  username,
  relation = 'followers',
  onClose,
}) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchList = relation === 'following' ? fetchFollowing : fetchFollowers;
    fetchList(userId)
      .then((result) => {
        if (active) setUsers(result.followers ?? result.users ?? []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ?? 'Unable to load followers.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [relation, userId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className={style.modalBackdrop} onClick={onClose}>
      <section
        className={`${style.postModal} ${style.followerDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follower-dialog-title"
        aria-busy={loading}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={style.modalHeader}>
          <h2 id="follower-dialog-title">
            {relation === 'following' ? `Following of @${username}` : `Followers of @${username}`}
          </h2>
          <button type="button" aria-label="Close follow list" onClick={onClose}>
            ×
          </button>
        </header>
        {error && <p className={style.errorBanner} role="alert">{error}</p>}
        {loading && <p className={style.status}>Loading {relation}...</p>}
        {!loading && !error && !users.length && (
          <p className={style.status}>No {relation} to show yet.</p>
        )}
        {users.length > 0 && (
          <ul className={style.followerList}>
            {users.map((user) => (
              <li key={user.id}>
                <Link
                  to={`/users/${user.id}`}
                  className={style.followerRow}
                  onClick={onClose}
                >
                  <Avatar user={user} className={style.highlightAvatar} />
                  <span className={style.followerIdentity}>
                    <strong>{user.username}</strong>
                    <span>@{user.username}</span>
                    {user.bio && <small>{user.bio}</small>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
