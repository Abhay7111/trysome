import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { fetchHomeHighlights } from '../services/explore.api';
import Avatar from './Avatar';
import RichText from './RichText';
import style from '../pages/Social.module.scss';

export default function RightRail() {
  const { pathname } = useLocation();
  const isHome = pathname === '/' || pathname === '/home';
  const [highlights, setHighlights] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHome) return undefined;
    let active = true;
    fetchHomeHighlights()
      .then((result) => {
        if (active) {
          setHighlights(result);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message
            ?? 'Unable to load highlights.'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [isHome]);

  if (isHome) {
    return (
      <aside className={style.rightRail}>
        <section className={style.trends}>
          <h2>New users</h2>
          {error && <p className={style.highlightError} role="alert">{error}</p>}
          {!highlights && !error && <span>Loading users...</span>}
          {highlights?.users?.length ? highlights.users.map((user) => (
            <Link
              to={`/users/${user.id}`}
              className={style.highlightUser}
              key={user.id}
            >
              <Avatar user={user} className={style.highlightAvatar} />
              <span>@{user.username}</span>
            </Link>
          )) : highlights && <span>No new users to show.</span>}
          <Link to="/explore" className={style.settingsLink}>Explore users</Link>
        </section>
        <section className={`${style.trends} ${style.newPostHighlights}`}>
          <h2>New posts</h2>
          {!highlights && !error && <span>Loading posts...</span>}
          {highlights?.posts?.length ? highlights.posts.map((post) => (
            <article className={style.highlightPost} key={post._id}>
              <Link
                to={`/users/${post.user?._id}`}
                className={style.highlightPostAuthor}
              >
                @{post.user?.username ?? 'User'}
              </Link>
              <div className={style.highlightPostBody}>
                <p><RichText>{post.caption}</RichText></p>
                <Link
                  to={`/users/${post.user?._id}?post=${encodeURIComponent(post._id)}`}
                  className={style.highlightPostOpen}
                  aria-label={`Open post by @${post.user?.username ?? 'User'}`}
                >
                  Open post
                </Link>
              </div>
            </article>
          )) : highlights && <span>No new posts to show.</span>}
          <Link to="/explore" className={style.settingsLink}>Explore posts</Link>
        </section>
      </aside>
    );
  }

  return (
    <aside className={style.rightRail}>
      <section className={style.trends}>
        <h2>What’s happening</h2>
        <p>Welcome to your timeline</p>
        <span>Share a thought or a moment with your community.</span>
      </section>
      <p className={style.footer}>About · Privacy · Terms · © 2026</p>
    </aside>
  );
}
