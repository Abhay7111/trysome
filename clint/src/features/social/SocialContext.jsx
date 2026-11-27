import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getMe } from '../auth/services/auth.api';
import { fetchPostInteractions, toggleLike, toggleSave } from '../services/post.api';
import { toggleBlock, toggleFollow } from '../services/users.api';
import { SocialContext } from './SocialStore';

export function SocialProvider({ children }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [followingUserIds, setFollowingUserIds] = useState(() => new Set());
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pendingPostIds, setPendingPostIds] = useState(() => new Set());
  const [pendingUserIds, setPendingUserIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    async function loadSocialData() {
      try {
        const user = await getMe();
        if (!active) return;
        const interactions = await fetchPostInteractions();
        if (!active) return;

        setProfile(user);
        setLikedPostIds(new Set(interactions.likedPostIds ?? []));
        setSavedPostIds(new Set(interactions.savedPostIds ?? []));
        setFollowingUserIds(new Set(interactions.followingUserIds ?? []));
        setBlockedUserIds(new Set(interactions.blockedUserIds ?? []));
        setBlockedUsers(interactions.blockedUsers ?? []);
      } catch (requestError) {
        if (!active) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
        } else {
          setLoadError(
            requestError.response?.data?.message
            ?? requestError.response?.data?.error
            ?? requestError.message
            ?? 'Unable to load your account.'
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadSocialData();
    return () => {
      active = false;
    };
  }, [navigate]);

  const updatePostIdSet = (setter, id, enabled) => {
    setter((current) => {
      const next = new Set(current);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePostLike = async (postId) => {
    const id = String(postId);
    if (pendingPostIds.has(id)) return null;
    setInteractionError('');
    setPendingPostIds((current) => new Set(current).add(id));
    try {
      const result = await toggleLike(id);
      updatePostIdSet(setLikedPostIds, id, result.liked);
      return result;
    } catch (requestError) {
      setInteractionError(
        requestError.response?.data?.message ?? 'Unable to update like.'
      );
      return null;
    } finally {
      setPendingPostIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const togglePostSave = async (postId) => {
    const id = String(postId);
    if (pendingPostIds.has(id)) return null;
    setInteractionError('');
    setPendingPostIds((current) => new Set(current).add(id));
    try {
      const result = await toggleSave(id);
      updatePostIdSet(setSavedPostIds, id, result.saved);
      return result;
    } catch (requestError) {
      setInteractionError(
        requestError.response?.data?.message ?? 'Unable to update saved post.'
      );
      return null;
    } finally {
      setPendingPostIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleUserFollow = async (userId) => {
    const id = String(userId);
    if (pendingUserIds.has(id)) return null;
    setInteractionError('');
    setPendingUserIds((current) => new Set(current).add(id));
    try {
      const result = await toggleFollow(id);
      updatePostIdSet(setFollowingUserIds, id, result.following);
      return result;
    } catch (requestError) {
      setInteractionError(
        requestError.response?.data?.message ?? 'Unable to update follow status.'
      );
      return null;
    } finally {
      setPendingUserIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleUserBlock = async (userId, user) => {
    const id = String(userId);
    if (pendingUserIds.has(id)) return null;
    setInteractionError('');
    setPendingUserIds((current) => new Set(current).add(id));
    try {
      const result = await toggleBlock(id);
      updatePostIdSet(setBlockedUserIds, id, result.blocked);
      setBlockedUsers((current) => (
        result.blocked
          ? [...current.filter((blockedUser) => blockedUser.id !== id), {
            id,
            username: user.username,
            profile_img: user.profile_img,
          }]
          : current.filter((blockedUser) => blockedUser.id !== id)
      ));
      if (result.blocked) updatePostIdSet(setFollowingUserIds, id, false);
      return result;
    } catch (requestError) {
      setInteractionError(
        requestError.response?.data?.message ?? 'Unable to update block status.'
      );
      return null;
    } finally {
      setPendingUserIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const contextValue = {
    profile,
    setProfile,
    isLoading,
    loadError,
    interactionError,
    likedPostIds,
    savedPostIds,
    followingUserIds,
    blockedUserIds,
    blockedUsers,
    pendingPostIds,
    pendingUserIds,
    togglePostLike,
    togglePostSave,
    toggleUserFollow,
    toggleUserBlock,
  };

  return (
    <SocialContext.Provider value={contextValue}>
      {children}
    </SocialContext.Provider>
  );
}
