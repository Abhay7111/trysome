import { useCallback, useEffect, useState } from 'react';
import { addComment, deletePost, updatePost } from '../services/post.api';
import { useSocial } from '../social/useSocial';
import PostEditDialog from './PostEditDialog';
import PostDetailsModal from './PostDetailsModal';
import PostList from './PostList';
import style from '../pages/Social.module.scss';

export default function PostFeed({
  posts,
  setPosts,
  openPostId,
  onPostRequestHandled,
}) {
  const {
    profile,
    togglePostLike,
    togglePostSave,
  } = useSocial();
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [modalMode, setModalMode] = useState('details');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [postActionError, setPostActionError] = useState('');
  const [pendingPostActionId, setPendingPostActionId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const activePostId = openPostId ?? selectedPostId;

  const closePost = useCallback(() => {
    setSelectedPostId(null);
    setModalMode('details');
    setCommentText('');
    setCommentError('');
    if (openPostId) onPostRequestHandled?.();
  }, [onPostRequestHandled, openPostId]);

  useEffect(() => {
    if (
      !activePostId
      || !posts.some((post) => String(post._id) === String(activePostId))
    ) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closePost();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activePostId, closePost, posts]);

  const openPost = (postId, mode = 'details') => {
    setCommentText('');
    setCommentError('');
    setModalMode(mode);
    setSelectedPostId(String(postId));
  };

  const handleLike = async (postId) => {
    const result = await togglePostLike(postId);
    if (!result) return;
    setPosts((current) => current.map((post) => (
      String(post._id) === String(postId)
        ? { ...post, likeCount: result.likeCount }
        : post
    )));
  };

  const handleSave = (postId) => togglePostSave(postId);

  const savePostEdit = async (postId, caption) => {
    setPendingPostActionId(postId);
    setPostActionError('');
    try {
      const result = await updatePost(postId, { caption });
      setPosts((current) => current.map((post) => (
        String(post._id) === postId ? result.post : post
      )));
      setEditingPost(null);
      return true;
    } catch (requestError) {
      setPostActionError(
        requestError.response?.data?.message ?? 'Unable to update post.'
      );
      return false;
    } finally {
      setPendingPostActionId(null);
    }
  };

  const changePostVisibility = async (postId, visibility) => {
    setPendingPostActionId(postId);
    setPostActionError('');
    try {
      const result = await updatePost(postId, { visibility });
      setPosts((current) => current.map((post) => (
        String(post._id) === postId ? result.post : post
      )));
    } catch (requestError) {
      setPostActionError(
        requestError.response?.data?.message ?? 'Unable to change post visibility.'
      );
    } finally {
      setPendingPostActionId(null);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    setPendingPostActionId(postId);
    setPostActionError('');
    try {
      await deletePost(postId);
      setPosts((current) => current.filter(
        (post) => String(post._id) !== postId
      ));
      if (String(activePostId) === postId) closePost();
      if (String(editingPost?._id) === postId) setEditingPost(null);
    } catch (requestError) {
      setPostActionError(
        requestError.response?.data?.message ?? 'Unable to delete post.'
      );
    } finally {
      setPendingPostActionId(null);
    }
  };

  const handleEditPost = (post) => {
    setPostActionError('');
    setEditingPost(post);
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!activePostId || !commentText.trim()) return;
    setCommentError('');
    setCommenting(true);
    try {
      const result = await addComment(activePostId, commentText.trim());
      const comment = { ...result.comment, user: profile };
      setPosts((current) => current.map((post) => (
        String(post._id) === String(activePostId)
          ? { ...post, comments: [...(post.comments ?? []), comment] }
          : post
      )));
      setCommentText('');
    } catch (requestError) {
      setCommentError(
        requestError.response?.data?.message ?? 'Unable to add comment.'
      );
    } finally {
      setCommenting(false);
    }
  };

  const selectedPost = posts.find(
    (post) => String(post._id) === String(activePostId)
  );

  return (
    <>
      {postActionError && (
        <p className={style.errorBanner} role="alert">{postActionError}</p>
      )}
      <PostList
        posts={posts}
        onLike={handleLike}
        onOpenPost={openPost}
        onEdit={handleEditPost}
        onToggleVisibility={changePostVisibility}
        onDelete={handleDeletePost}
        pendingPostActionId={pendingPostActionId}
      />
      {editingPost && (
        <PostEditDialog
          post={editingPost}
          error={postActionError}
          saving={pendingPostActionId === String(editingPost._id)}
          onClose={() => {
            if (!pendingPostActionId) setEditingPost(null);
          }}
          onSave={savePostEdit}
        />
      )}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          mode={modalMode}
          commentText={commentText}
          commentError={commentError}
          commenting={commenting}
          onClose={closePost}
          onLike={() => handleLike(selectedPost._id)}
          onSave={() => handleSave(selectedPost._id)}
          onCommentTextChange={setCommentText}
          onCommentSubmit={handleComment}
        />
      )}
    </>
  );
}
