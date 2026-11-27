import { useCallback, useState } from 'react';
import { fetchMyPosts } from '../services/post.api';
import { useSocial } from '../social/useSocial';
import Avatar from '../components/Avatar';
import PostFeed from '../components/PostFeed';
import ProfileEditor from '../components/ProfileEditor';
import useSocialPosts from '../hooks/useSocialPosts';
import style from './Social.module.scss';

export default function ProfilePage() {
  const { profile, setProfile } = useSocial();
  const loadPosts = useCallback(() => fetchMyPosts(), []);
  const { posts, setPosts, isLoading, error } = useSocialPosts(loadPosts);
  const [isEditing, setIsEditing] = useState(false);

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
          <p className={style.postCount}>
            <strong>{posts.length}</strong> {posts.length === 1 ? 'post' : 'posts'}
          </p>
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
          : <PostFeed posts={posts} setPosts={setPosts} />}
      </section>
    </>
  );
}
