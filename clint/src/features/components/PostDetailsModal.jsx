import { RiBookmarkFill, RiBookmarkLine, RiCloseLine, RiHeartFill, RiHeartLine } from '@remixicon/react';
import { useSocial } from '../social/useSocial';
import Avatar from './Avatar';
import MentionInput from './MentionInput';
import RichText from './RichText';
import style from '../pages/Social.module.scss';

export default function PostDetailsModal({
  post,
  mode,
  commentText,
  commentError,
  commenting,
  onClose,
  onLike,
  onSave,
  onCommentTextChange,
  onCommentSubmit,
}) {
  const {
    profile,
    likedPostIds,
    savedPostIds,
    pendingPostIds,
    interactionError,
  } = useSocial();
  const postId = String(post._id);
  const liked = likedPostIds.has(postId);
  const saved = savedPostIds.has(postId);
  const pending = pendingPostIds.has(postId);
  const author = post.user?.username ? post.user : profile;
  const date = post.createdAt ? new Date(post.createdAt).toLocaleString() : '';

  return (
    <div className={style.modalBackdrop} onClick={onClose}>
      <section
        className={style.postModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={style.modalHeader}>
          <h2 id="post-details-title">{mode === 'comments' ? 'Comments' : 'Post'}</h2>
          <button type="button" onClick={onClose} aria-label="Close post details">
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>
        {mode === 'comments' ? (
          <div className={style.commentContext}>
            <Avatar user={author} />
            <div>
              <strong>@{author.username}</strong>
              <p><RichText>{post.caption}</RichText></p>
            </div>
          </div>
        ) : (
          <article className={style.modalPost}>
            <Avatar user={author} />
            <div className={style.modalPostContent}>
              <div className={style.postMeta}>
                <strong>{author.username}</strong>
                <span>@{author.username}</span>
                {date && <span>· {date}</span>}
                {post.visibility === 'private' && (
                  <span className={style.privateBadge}>· Only me</span>
                )}
              </div>
              <p><RichText>{post.caption}</RichText></p>
              {post.post_url && (
                <img className={style.postImage} src={post.post_url} alt="" />
              )}
            </div>
          </article>
        )}
        <div className={style.modalActions}>
          <button
            type="button"
            className={liked ? style.likedAction : ''}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            aria-pressed={liked}
            disabled={pending}
            onClick={onLike}
          >
            {liked
              ? <RiHeartFill className={style.navIcon} aria-hidden="true" />
              : <RiHeartLine className={style.navIcon} aria-hidden="true" />}
            <span>{post.likeCount ?? post.likes?.length ?? 0}</span>
          </button>
          <button
            type="button"
            className={saved ? style.savedAction : ''}
            aria-label={saved ? 'Unsave post' : 'Save post'}
            aria-pressed={saved}
            disabled={pending}
            onClick={onSave}
          >
            {saved
              ? <RiBookmarkFill className={style.navIcon} aria-hidden="true" />
              : <RiBookmarkLine className={style.navIcon} aria-hidden="true" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
        {interactionError && (
          <p className={style.modalError} role="alert">{interactionError}</p>
        )}
        <div className={style.commentList}>
          {post.comments?.map((comment) => {
            const commenter = comment.user?.username ? comment.user : profile;
            return (
              <article className={style.comment} key={comment._id}>
                <Avatar user={commenter} />
                <div>
                  <strong>{commenter.username}</strong>
                  <p><RichText>{comment.text}</RichText></p>
                </div>
              </article>
            );
          })}
        </div>
        <form className={style.commentForm} onSubmit={onCommentSubmit}>
          <Avatar user={profile} />
          <MentionInput
            autoFocus
            currentUserId={profile.id}
            aria-label="Write a comment"
            placeholder="Post your reply"
            value={commentText}
            maxLength={280}
            onChange={onCommentTextChange}
          />
          <button type="submit" disabled={commenting || !commentText.trim()}>
            {commenting ? 'Replying...' : 'Reply'}
          </button>
        </form>
        {commentError && (
          <p className={style.modalError} role="alert">{commentError}</p>
        )}
      </section>
    </div>
  );
}
