import { useEffect, useState } from "react";
import { Public as fetchPublicPosts } from "../../features/services/public.api";
import style from "../style/publicPost.module.scss";

const Public_component = () => {
  const [post, setPost] = useState([]);

  useEffect(() => {
    fetchPublicPosts().then(({ posts }) => {
      setPost(posts?.map((p) => p).filter(Boolean) ?? []);
    });
  }, []);

  return (
    <div className={style.main}>
      {post.map((postItem) => (
        <div className={style.container}>
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
        </div>
      ))}
    </div>
  );
};

export default Public_component;
