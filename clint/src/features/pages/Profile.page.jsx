import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchMyPosts } from '../services/post.api';
import { fetchProfileStats } from '../services/users.api';
import { useSocial } from '../social/useSocial';
import Avatar from '../components/Avatar';
import FollowerListDialog from '../components/FollowerListDialog';
import PostFeed from '../components/PostFeed';
import ProfileEditor from '../components/ProfileEditor';
import useSocialPosts from '../hooks/useSocialPosts';
import style from './Social.module.scss';

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openPostId = searchParams.get('post');
  const { profile, setProfile } = useSocial();
  const loadPosts = useCallback(() => fetchMyPosts(), []);
  const { posts, setPosts, isLoading, error } = useSocialPosts(loadPosts);
  const [isEditing, setIsEditing] = useState(false);
  const [followList, setFollowList] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const handlePostRequestHandled = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('post');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    let active = true;
    fetchProfileStats(profile.id)
      .then((stats) => {
        if (active) {
          setProfileStats(stats);
          setStatsError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setStatsError(
            requestError.response?.data?.message ?? 'Unable to load profile counts.'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [profile.id]);

  return (
    <>
      <header className={style.header}><h1>Profile</h1></header>
      <section className={style.profileCard}>
        <div
          className={style.cover}
          style={profile.banner_img
            ? { backgroundImage: `url("${profile.banner_img}")` }
            : undefined}
        />
        <div className={style.profileDetails}>
          <Avatar user={profile} className={style.profileAvatar} />
          <h2>{profile.username}</h2>
          <p className={style.handle}>@{profile.username}</p>
          <p>{profile.email}</p>
          <p className={style.profilePrivacy}>
            {profile.isPrivate ? 'Private profile' : 'Public profile'}
          </p>
          <div className={style.profileStats}>
            <div className={style.profileStat}>
              <strong>{profileStats?.postsCount ?? posts.length}</strong>
              <span>posts</span>
            </div>
            <button
              type="button"
              className={style.profileStat}
              onClick={() => setFollowList('followers')}
            >
              <strong>{profileStats?.followersCount ?? '—'}</strong>
              <span>followers</span>
            </button>
            <button
              type="button"
              className={style.profileStat}
              onClick={() => setFollowList('following')}
            >
              <strong>{profileStats?.followingCount ?? '—'}</strong>
              <span>following</span>
            </button>
          </div>
          {statsError && <p className={style.error} role="alert">{statsError}</p>}
          <button
            type="button"
            className={style.settingsButton}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? 'Close profile editor' : 'Update profile'}
          </button>
          {isEditing && (
            <ProfileEditor
              profile={profile}
              onProfileUpdated={(updates) => {
                setProfile((current) => ({ ...current, ...updates }));
              }}
              onDetailsSaved={() => setIsEditing(false)}
            />
          )}
        </div>
        <h2 className={style.postsHeading}>Posts</h2>
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
      </section>
      {followList && (
        <FollowerListDialog
          userId={profile.id}
          username={profile.username}
          relation={followList}
          onClose={() => setFollowList(null)}
        />
      )}
    </>
  );
}
