import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { searchExplore } from '../services/explore.api';
import PostFeed from '../components/PostFeed';
import UserSearchResults from '../components/UserSearchResults';
import style from './Social.module.scss';

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const [type, setType] = useState(() => (
    ['posts', 'users', 'tags'].includes(searchParams.get('type'))
      ? searchParams.get('type')
      : 'posts'
  ));
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [results, setResults] = useState({ posts: [], users: [] });
  const [searched, setSearched] = useState(false);
  const [searchedType, setSearchedType] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedType = searchParams.get('type');
    const requestedQuery = searchParams.get('q')?.trim() ?? '';
    if (
      !['posts', 'users', 'tags'].includes(requestedType)
      || requestedQuery.length < 2
    ) {
      return undefined;
    }

    let active = true;
    searchExplore(requestedType, requestedQuery)
      .then((result) => {
        if (!active) return;
        setType(requestedType);
        setQuery(requestedQuery);
        setResults({
          posts: result.posts ?? [],
          users: result.users ?? [],
        });
        setSearchedType(requestedType);
        setSearched(true);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setType(requestedType);
        setQuery(requestedQuery);
        setError(requestError.response?.data?.message ?? 'Unable to search right now.');
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setError('Enter at least 2 characters to search.');
      return;
    }

    setSearching(true);
    setError('');
    setSearched(false);
    try {
      const result = await searchExplore(type, searchTerm);
      setResults({
        posts: result.posts ?? [],
        users: result.users ?? [],
      });
      setSearchedType(type);
      setSearched(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to search right now.');
    } finally {
      setSearching(false);
    }
  };

  const updatePosts = (nextPosts) => {
    setResults((current) => ({
      ...current,
      posts: typeof nextPosts === 'function'
        ? nextPosts(current.posts)
        : nextPosts,
    }));
  };

  return (
    <>
      <header className={style.header}><h1>Explore</h1></header>
      <section className={style.explorePage}>
        <form className={style.exploreSearch} onSubmit={handleSearch}>
          <label>
            Search for
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="posts">Posts</option>
              <option value="users">Users</option>
              <option value="tags">Tags</option>
            </select>
          </label>
          <input
            type="search"
            aria-label={`Search ${type}`}
            placeholder={
              type === 'posts'
                ? 'Search posts'
                : type === 'users'
                  ? 'Search users'
                  : 'Search #tags'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={searching || query.trim().length < 2}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className={style.errorBanner} role="alert">{error}</p>}
        {searched && searchedType === type && ['posts', 'tags'].includes(type) && (
          <PostFeed posts={results.posts} setPosts={updatePosts} />
        )}
        {searched && searchedType === type && type === 'users' && (
          <UserSearchResults users={results.users} />
        )}
        {(!searched || searchedType !== type) && !searching && (
          <p className={style.exploreHint}>
            Search public posts, find users, or explore hashtags.
          </p>
        )}
      </section>
    </>
  );
}
