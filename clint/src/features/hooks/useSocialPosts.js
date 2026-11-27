import { useEffect, useState } from 'react';

export default function useSocialPosts(loadPosts) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadPosts()
      .then((result) => {
        if (active) setPosts(Array.isArray(result.posts) ? result.posts : []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message
            ?? requestError.response?.data?.error
            ?? requestError.message
            ?? 'Unable to load posts.'
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadPosts]);

  return { posts, setPosts, isLoading, error };
}
