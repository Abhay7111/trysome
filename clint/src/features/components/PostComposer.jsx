import { useRef, useState } from 'react';
import { RiImageAddLine } from '@remixicon/react';
import { createPost } from '../services/post.api';
import { useSocial } from '../social/useSocial';
import Avatar from './Avatar';
import MentionInput from './MentionInput';
import style from '../pages/Social.module.scss';

export default function PostComposer({ onPostCreated, inputRef }) {
  const { profile } = useSocial();
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const imageInput = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPosting(true);
    try {
      const { post } = await createPost(caption.trim(), image, visibility);
      onPostCreated({
        ...post,
        user: profile,
        visibility,
        likeCount: 0,
        comments: post.comments ?? [],
      });
      setCaption('');
      setImage(null);
      setVisibility('public');
      if (imageInput.current) imageInput.current.value = '';
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        ?? requestError.response?.data?.error
        ?? requestError.message
        ?? 'Unable to publish your post.'
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <form className={style.composer} onSubmit={handleSubmit}>
      <Avatar user={profile} />
      <div className={style.composerBody}>
        <MentionInput
          ref={inputRef}
          multiline
          currentUserId={profile.id}
          aria-label="Write a post"
          placeholder="What is happening?!"
          value={caption}
          onChange={setCaption}
          maxLength={280}
          required
        />
        {image && <p className={style.selectedImage}>Image: {image.name}</p>}
        {error && <p className={style.error} role="alert">{error}</p>}
        <div className={style.composerActions}>
          <label className={style.imagePicker}>
            <RiImageAddLine className={style.navIcon} aria-hidden="true" />
            <span>Add image</span>
            <input
              ref={imageInput}
              type="file"
              accept="image/*"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className={style.visibilityPicker}>
            <span>Who can see this?</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Only me</option>
            </select>
          </label>
          <span className={style.characterCount}>{caption.length}/280</span>
          <button type="submit" disabled={posting || !caption.trim()}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
