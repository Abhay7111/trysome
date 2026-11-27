import { useEffect, useState } from "react";
import { RiShareLine } from "@remixicon/react";
import { Public as fetchPublicPosts } from "../../features/services/public.api";
import { sharePostLink } from "../../features/services/sharePost";
import style from "../style/publicPost.module.scss";

const Public_component = () => {
  const [post, setPost] = useState([]);
  const [sharingPostId, setSharingPostId] = useState(null);
  const [shareFeedback, setShareFeedback] = useState({});

  useEffect(() => {
    fetchPublicPosts().then(({ posts }) => {
      setPost(posts?.map((p) => p).filter(Boolean) ?? []);
    });
  }, []);

  const handleShare = async (postItem) => {
    const postId = String(postItem._id ?? "");
    if (!postId) {
      setShareFeedback((current) => ({
        ...current,
        [postId]: "This post cannot be shared right now.",
      }));
      return;
    }

    setSharingPostId(postId);
    setShareFeedback((current) => ({ ...current, [postId]: "" }));
    try {
      const result = await sharePostLink(postItem);
      if (result === "cancelled") return;
      setShareFeedback((current) => ({
        ...current,
        [postId]: result === "shared" ? "Post shared." : "Post link copied.",
      }));
    } catch (error) {
      setShareFeedback((current) => ({
        ...current,
        [postId]: error.message ?? "Unable to share this post.",
      }));
    } finally {
      setSharingPostId(null);
    }
  };

  return (
    <div className={style.main}>
      {post.map((postItem) => {
        const postId = String(postItem._id ?? "");
        return (
          <div className={style.container} key={postId}>
            <div className={style.profile}>
              <div className={style.img}>i</div>
              <div className={style.userDetail}>
                <div className={style.userName}>username</div>
              </div>
              <div></div>
            </div>
            <div className={style.publicPost}>
              <p>{postItem.caption}</p>
              <img src={postItem.post_url} alt="" />
            </div>
            <div className={style.buttons}>
              <button
                type="button"
                disabled={!postId || sharingPostId !== null}
                aria-label={`Share post by @${postItem.user?.username ?? "user"}`}
                onClick={() => handleShare(postItem)}
              >
                <RiShareLine aria-hidden="true" />
                <span>{sharingPostId === postId ? "Sharing..." : "Share"}</span>
              </button>
              {shareFeedback[postId] && (
                <span className={style.shareFeedback} role="status">
                  {shareFeedback[postId]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Public_component;
