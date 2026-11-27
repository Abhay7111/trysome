export async function sharePostLink(post) {
  const postId = String(post?._id ?? '');
  const authorId = String(post?.user?._id ?? post?.user?.id ?? '');
  if (!postId || !authorId) {
    throw new Error('This post cannot be shared right now.');
  }
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Sharing is unavailable in this environment.');
  }

  const postUrl = new URL(
    `/users/${encodeURIComponent(authorId)}`,
    window.location.origin
  );
  postUrl.searchParams.set('post', postId);
  const shareData = {
    title: `Post by @${post.user?.username ?? 'user'}`,
    text: post.caption || 'Check out this post.',
    url: postUrl.toString(),
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('Unable to share this post.', { cause: error });
      }
    }
  }

  if (typeof navigator.clipboard?.writeText !== 'function') {
    throw new Error('Sharing is unavailable in this browser.');
  }

  try {
    await navigator.clipboard.writeText(postUrl.toString());
    return 'copied';
  } catch {
    throw new Error('Unable to share or copy this post link.');
  }
}
