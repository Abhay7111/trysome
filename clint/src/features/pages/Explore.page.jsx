import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { searchExplore } from '../services/explore.api';
import PostFeed from '../components/PostFeed';
import UserSearchResults from '../components/UserSearchResults';
import style from './Social.module.scss';

const searchTypes = [
  { value: 'posts', label: 'Posts', description: 'Find conversations and updates' },
  { value: 'users', label: 'Users', description: 'Discover people to follow' },
  { value: 'tags', label: 'Tags', description: 'Browse topics by hashtag' },
];

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
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typePickerRef = useRef(null);
  const typeMenuRef = useRef(null);
  const typeTriggerRef = useRef(null);
  const selectedType = searchTypes.find((option) => option.value === type);

  useEffect(() => {
    if (!typeMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!typePickerRef.current?.contains(event.target)) {
        setTypeMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [typeMenuOpen]);

  const handleTypePickerKeyDown = (event) => {
    if (event.key === 'Escape' && typeMenuOpen) {
      event.preventDefault();
      setTypeMenuOpen(false);
      typeTriggerRef.current?.focus();
      return;
    }

    if (
      !typeMenuOpen
      || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
    ) {
      return;
    }

    const options = Array.from(
      typeMenuRef.current?.querySelectorAll('[role="menuitemradio"]') ?? []
    );
    if (!options.length) return;

    const currentIndex = options.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : currentIndex === -1
          ? event.key === 'ArrowDown' ? 0 : options.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length)
            % options.length;

    event.preventDefault();
    options[nextIndex].focus();
  };

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
          <div
            ref={typePickerRef}
            className={style.exploreTypePicker}
            onKeyDown={handleTypePickerKeyDown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setTypeMenuOpen(false);
              }
            }}
          >
            <span className={style.exploreTypeLabel}>Search for</span>
            <button
              ref={typeTriggerRef}
              type="button"
              className={style.exploreTypeTrigger}
              aria-label="Search for"
              aria-haspopup="menu"
              aria-expanded={typeMenuOpen}
              onClick={() => setTypeMenuOpen((open) => !open)}
            >
              {selectedType.label}
              <span className={style.exploreTypeChevron} aria-hidden="true" />
            </button>
            {typeMenuOpen && (
              <div ref={typeMenuRef} className={style.exploreTypeMenu} role="menu">
                {searchTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={type === option.value}
                    className={`${style.exploreTypeOption} ${
                      type === option.value ? style.exploreTypeOptionSelected : ''
                    }`}
                    onClick={() => {
                      setType(option.value);
                      setTypeMenuOpen(false);
                      typeTriggerRef.current?.focus();
                    }}
                  >
                    <span className={style.exploreTypeOptionText}>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className={style.exploreTypeCheck} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
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
