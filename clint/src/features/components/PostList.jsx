import { useState } from 'react';
import { Link } from 'react-router';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiChat1Line,
  RiHeartFill,
  RiHeartLine,
  RiMore2Line,
} from '@remixicon/react';
import { useSocial } from '../social/useSocial';
import Avatar from './Avatar';
import RichText from './RichText';
import style from '../pages/Social.module.scss';

export default function PostList({
  posts,
  onLike,
  onOpenPost,
  onEdit,
  onToggleVisibility,
  onDelete,
  pendingPostActionId,
}) {
  const {
    profile,
    likedPostIds,
    savedPostIds,
    pendingPostIds,
    togglePostSave,
  } = useSocial();
  const [openMenuPostId, setOpenMenuPostId] = useState(null);

  if (!posts.length) {
    return (
      <div className={style.emptyState}>
        <h2>No posts yet</h2>
        <p>When there are posts to show, they’ll appear here.</p>
      </div>
    );
  }

  return (
    <div className={style.posts}>
      {posts.map((post) => {
        const author = post.user?.username ? post.user : profile;
        const postId = String(post._id);
        const authorId = String(author?._id ?? author?.id ?? '');
        const isOwnPost = authorId === String(profile.id);
        const authorPath = isOwnPost ? '/profile' : `/users/${authorId}`;
        const likeCount = post.likeCount ?? post.likes?.length ?? 0;
        const commentCount = post.comments?.length ?? post.commentCount ?? 0;
        const date = post.createdAt
          ? new Date(post.createdAt).toLocaleDateString()
          : '';

        return (
          <article
            className={style.post}
            key={postId}
            tabIndex={0}
            aria-label={`Post by @${author.username}. Open post details.`}
            onClick={() => onOpenPost(postId)}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget
                && (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault();
                onOpenPost(postId);
              }
            }}
          >
            <Avatar user={author} />
            <div className={style.postContent}>
              <div className={style.postMeta}>
                <Link
                  to={authorPath}
                  className={style.authorLink}
                  onClick={(event) => event.stopPropagation()}
                >
                  <strong>{author.username}</strong>
                </Link>
                <span>@{author.username}</span>
                {date && <span>· {date}</span>}
                {post.visibility === 'private' && (
                  <span className={style.privateBadge}>· Only me</span>
                )}
                {isOwnPost && (
                  <div
                    className={style.profileMenu}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={style.profileMenuButton}
                      aria-label={`Post options for @${author.username}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuPostId === postId}
                      onClick={() => setOpenMenuPostId((current) => (
                        current === postId ? null : postId
                      ))}
                    >
                      <RiMore2Line aria-hidden="true" />
                    </button>
                    {openMenuPostId === postId && (
                      <div className={style.profileMenuDropdown} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            onEdit(post);
                          }}
                        >
                          Edit post
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={pendingPostActionId === postId}
                          onClick={() => {
                            setOpenMenuPostId(null);
                            onToggleVisibility(
                              postId,
                              post.visibility === 'private' ? 'public' : 'private'
                            );
                          }}
                        >
                          Make {post.visibility === 'private' ? 'public' : 'private'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={pendingPostActionId === postId}
                          onClick={() => {
                            setOpenMenuPostId(null);
                            onDelete(postId);
                          }}
                        >
                          Delete post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p><RichText>{post.caption}</RichText></p>
              {post.post_url && (
                <img className={style.postImage} src={post.post_url} alt="" />
              )}
              <div className={style.postActions}>
                <button
                  type="button"
                  aria-label={`Comment on post, ${commentCount} comments`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenPost(postId, 'comments');
                  }}
                >
                  <RiChat1Line className={style.navIcon} aria-hidden="true" />
                  <span>{commentCount}</span>
                </button>
                <button
                  type="button"
                  className={likedPostIds.has(postId) ? style.likedAction : ''}
                  aria-label={likedPostIds.has(postId) ? 'Unlike post' : 'Like post'}
                  aria-pressed={likedPostIds.has(postId)}
                  disabled={pendingPostIds.has(postId)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onLike(postId);
                  }}
                >
                  {likedPostIds.has(postId)
                    ? <RiHeartFill className={style.navIcon} aria-hidden="true" />
                    : <RiHeartLine className={style.navIcon} aria-hidden="true" />}
                  <span>{likeCount}</span>
                </button>
                <button
                  type="button"
                  className={savedPostIds.has(postId) ? style.savedAction : ''}
                  aria-label={savedPostIds.has(postId) ? 'Unsave post' : 'Save post'}
                  aria-pressed={savedPostIds.has(postId)}
                  disabled={pendingPostIds.has(postId)}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePostSave(postId);
                  }}
                >
                  {savedPostIds.has(postId)
                    ? <RiBookmarkFill className={style.navIcon} aria-hidden="true" />
                    : <RiBookmarkLine className={style.navIcon} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
