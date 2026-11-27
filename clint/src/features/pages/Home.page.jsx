import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { fetchFeedPosts } from '../services/post.api';
import PostComposer from '../components/PostComposer';
import PostFeed from '../components/PostFeed';
import useSocialPosts from '../hooks/useSocialPosts';
import style from './Social.module.scss';

function shufflePosts(posts) {
  const shuffled = [...posts];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export default function HomePage() {
  const loadFeed = useCallback(() => fetchFeedPosts(), []);
  const { posts, setPosts, isLoading, error } = useSocialPosts(loadFeed);
  const [searchParams, setSearchParams] = useSearchParams();
  const composerInput = useRef(null);

  useEffect(() => {
    if (searchParams.get('compose') !== '1') return;
    composerInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    composerInput.current?.focus();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('compose');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleShuffle = () => {
    setPosts((current) => shufflePosts(current));
  };
  const handlePostRequestHandled = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('post');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const openPostId = searchParams.get('post');

  return (
    <>
      <header className={style.header}>
        <h1>Home</h1>
        <div className={style.feedTabs}>
          <span className={style.selectedTab}>For you</span>
          <button type="button" onClick={handleShuffle}>Shuffle</button>
        </div>
      </header>
      <PostComposer
        inputRef={composerInput}
        onPostCreated={(post) => setPosts((current) => [post, ...current])}
      />
      {error && <p className={style.errorBanner} role="alert">{error}</p>}
      {isLoading
        ? <p className={style.status}>Loading posts...</p>
        : (
          <PostFeed
            posts={posts}
            setPosts={setPosts}
            openPostId={openPostId}
            onPostRequestHandled={handlePostRequestHandled}
          />
        )}
    </>
  );
}
