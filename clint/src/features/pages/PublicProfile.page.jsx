import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  RiMore2Line,
  RiUserFollowLine,
  RiUserForbidLine,
  RiUserUnfollowLine,
} from '@remixicon/react';
import { fetchPublicUserProfile } from '../services/users.api';
import { useSocial } from '../social/useSocial';
import Avatar from '../components/Avatar';
import PostFeed from '../components/PostFeed';
import style from './Social.module.scss';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const {
    profile,
    blockedUserIds,
    pendingUserIds,
    toggleUserFollow,
    toggleUserBlock,
  } = useSocial();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const loading = String(loadedUserId) !== String(userId);

  useEffect(() => {
    if (
      String(userId) === String(profile.id)
      || userId === profile.username
    ) {
      navigate('/profile', { replace: true });
      return undefined;
    }

    let active = true;
    fetchPublicUserProfile(userId)
      .then((result) => {
        if (!active) return;
        setProfileData({
          ...result.profile,
          isFollowing: result.isFollowing,
          isFollowedBy: result.isFollowedBy,
          hasRequestedFollow: result.hasRequestedFollow,
        });
        setPosts(result.posts ?? []);
        setError('');
        setLoadedUserId(userId);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ?? 'Unable to load this profile.'
          );
          setLoadedUserId(userId);
        }
      })

    return () => {
      active = false;
    };
  }, [navigate, profile.id, profile.username, userId]);

  const handleBlock = async () => {
    const targetUserId = profileData?.id ?? userId;
    const result = await toggleUserBlock(targetUserId, profileData);
    if (!result) return;
    setMenuOpen(false);
    if (result.blocked) {
      setPosts([]);
      return;
    }

    try {
      const refreshedProfile = await fetchPublicUserProfile(userId);
      setProfileData({
        ...refreshedProfile.profile,
        isFollowing: refreshedProfile.isFollowing,
        isFollowedBy: refreshedProfile.isFollowedBy,
        hasRequestedFollow: refreshedProfile.hasRequestedFollow,
      });
      setPosts(refreshedProfile.posts ?? []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        ?? 'Unblocked account, but unable to refresh its profile.'
      );
    }
  };

  const targetUserId = profileData?.id ?? userId;
  const handleFollow = async () => {
    const result = await toggleUserFollow(targetUserId);
    if (!result) return;
    setProfileData((current) => ({
      ...current,
      isFollowing: result.following,
      hasRequestedFollow: result.requested,
    }));
    if (profileData?.isPrivate && !result.following) setPosts([]);
  };
  const isBlocked = blockedUserIds.has(String(targetUserId));
  const isFollowing = Boolean(profileData?.isFollowing);
  const hasRequestedFollow = Boolean(profileData?.hasRequestedFollow);
  const canChat = isFollowing && Boolean(profileData?.isFollowedBy);

  if (loading) {
    return <p className={style.status}>Loading profile...</p>;
  }
  if (error || !profileData) {
    return (
      <>
        <header className={style.header}><h1>Profile</h1></header>
        <p className={style.errorBanner} role="alert">{error || 'Profile not found.'}</p>
      </>
    );
  }

  return (
    <>
      <header className={style.header}><h1>Profile</h1></header>
      <section className={style.profileCard}>
        <div
          className={style.cover}
          style={profileData.banner_img
            ? { backgroundImage: `url("${profileData.banner_img}")` }
            : undefined}
        />
        <div className={style.profileDetails}>
          <Avatar user={profileData} className={style.profileAvatar} />
          <div className={style.publicProfileActions}>
            <div className={style.profileMenu}>
              <button
                type="button"
                className={style.profileMenuButton}
                aria-label={`More options for @${profileData.username}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <RiMore2Line aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className={style.profileMenuDropdown} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pendingUserIds.has(String(targetUserId))}
                    onClick={handleBlock}
                  >
                    <RiUserForbidLine aria-hidden="true" />
                    {isBlocked ? 'Unblock' : 'Block'} @{profileData.username}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className={style.followButton}
              aria-pressed={isFollowing}
              disabled={isBlocked || pendingUserIds.has(String(targetUserId))}
              onClick={handleFollow}
            >
              {isFollowing
                ? <RiUserUnfollowLine aria-hidden="true" />
                : <RiUserFollowLine aria-hidden="true" />}
              {isFollowing ? 'Following' : hasRequestedFollow ? 'Requested' : 'Follow'}
            </button>
          </div>
          <h2>{profileData.username}</h2>
          <p className={style.handle}>@{profileData.username}</p>
          {profileData.bio && <p className={style.profileBio}>{profileData.bio}</p>}
          <p className={style.profilePrivacy}>
            {profileData.isPrivate ? 'Private profile' : 'Public profile'}
          </p>
          {profileData.isPrivate && !isFollowing && (
            <p className={style.profilePrivacy}>
              {hasRequestedFollow
                ? 'Your follow request is waiting for approval.'
                : 'Follow this account to request access to its posts.'}
            </p>
          )}
          {canChat && (
            <p className={style.profilePrivacy}>
              You both follow each other and can start a chat.
            </p>
          )}
          {isFollowing && !profileData.isFollowedBy && (
            <p className={style.profilePrivacy}>
              They need to follow you back before you can chat.
            </p>
          )}
          <p className={style.postCount}>
            <strong>{posts.length}</strong> {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <h2 className={style.postsHeading}>Posts</h2>
        {profileData.isPrivate && !isFollowing
          ? <p className={style.profilePrivacy}>Posts are visible after your follow request is approved.</p>
          : <PostFeed posts={posts} setPosts={setPosts} />}
      </section>
    </>
  );
}
