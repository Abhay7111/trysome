import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiChat1Line,
  RiHeartFill,
  RiHeartLine,
  RiMore2Line,
  RiShareLine,
} from '@remixicon/react';
import { useSocial } from '../social/useSocial';
import { sharePostLink } from '../services/sharePost';
import Avatar from './Avatar';
import PostImageViewer from './PostImageViewer';
import RichText from './RichText';
import style from '../pages/Social.module.scss';

function PostCaption({ caption, postId, onOpenPost }) {
  const captionRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (expanded || !captionRef.current) return undefined;

    const element = captionRef.current;
    const updateOverflow = () => {
      setHasMore(element.scrollHeight > element.clientHeight + 1);
    };
    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [caption, expanded]);

  return (
    <div className={style.postCaption}>
      <p
        ref={captionRef}
        className={`${style.postCaptionText} ${
          expanded ? style.postCaptionExpanded : style.postCaptionCollapsed
        }`}
        onClick={() => onOpenPost(postId)}
      >
        <RichText>{caption}</RichText>
      </p>
      {hasMore && (
        <button
          type="button"
          className={style.postCaptionToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );
}

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [sharingPostId, setSharingPostId] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);

  const handleShare = async (post) => {
    const postId = String(post._id);
    setSharingPostId(postId);
    setShareStatus(null);
    try {
      const result = await sharePostLink(post);
      if (result !== 'cancelled') {
        setShareStatus({
          postId,
          message: result === 'shared' ? 'Post shared.' : 'Post link copied.',
        });
      }
    } catch (error) {
      setShareStatus({
        postId,
        message: error.message ?? 'Unable to share this post.',
      });
    } finally {
      setSharingPostId(null);
    }
  };

  if (!posts.length) {
    return (
      <div className={style.emptyState}>
        <h2>No posts yet</h2>
        <p>When there are posts to show, they’ll appear here.</p>
      </div>
    );
  }

  return (
    <>
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
              aria-label={`Post by @${author.username}. Press Enter to open post details.`}
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
                        className={style.postMenuButton}
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
                <PostCaption
                  caption={post.caption}
                  postId={postId}
                  onOpenPost={onOpenPost}
                />
                {post.post_url && (
                  <button
                    type="button"
                    className={style.postImageButton}
                    aria-label={`View full image from @${author.username}'s post`}
                    onClick={() => setSelectedImage({
                      src: post.post_url,
                      alt: `Image from @${author.username}'s post`,
                    })}
                  >
                    <img className={style.postImage} src={post.post_url} alt="" />
                  </button>
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
                  {post.visibility !== 'private' && (
                    <button
                      type="button"
                      className={style.postShareButton}
                      aria-label={`Share post by @${author.username}`}
                      disabled={sharingPostId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleShare(post);
                      }}
                    >
                      <RiShareLine className={style.navIcon} aria-hidden="true" />
                      <span>{sharingPostId === postId ? 'Sharing...' : 'Share'}</span>
                    </button>
                  )}
                </div>
                {shareStatus?.postId === postId && (
                  <p className={style.postShareStatus} role="status">
                    {shareStatus.message}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <PostImageViewer image={selectedImage} onClose={setSelectedImage} />
    </>
  );
}
