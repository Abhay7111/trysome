import { useState } from 'react';
import { RiCloseLine } from '@remixicon/react';
import { useSocial } from '../social/useSocial';
import MentionInput from './MentionInput';
import style from '../pages/Social.module.scss';

export default function PostEditDialog({
  post,
  error,
  saving,
  onClose,
  onSave,
}) {
  const { profile } = useSocial();
  const [caption, setCaption] = useState(post.caption);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!caption.trim()) return;
    await onSave(String(post._id), caption.trim());
  };

  return (
    <div className={style.modalBackdrop} onClick={saving ? undefined : onClose}>
      <section
        className={style.postModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={style.modalHeader}>
          <h2 id="edit-post-title">Edit post</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close edit post">
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>
        <form className={style.editPostForm} onSubmit={handleSubmit}>
          <MentionInput
            multiline
            name="caption"
            currentUserId={profile.id}
            aria-label="Edit post caption"
            value={caption}
            maxLength={280}
            onChange={setCaption}
          />
          <div className={style.editPostActions}>
            <span>{caption.length}/280</span>
            <button type="submit" disabled={saving || !caption.trim()}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
          {error && <p className={style.errorBanner} role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}
