import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine } from '@remixicon/react';
import style from '../pages/Social.module.scss';

export default function PostImageViewer({ image, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!image) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose(null);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape, true);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape, true);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [image, onClose]);

  if (!image) return null;

  return createPortal(
    <div
      className={style.postImageViewerBackdrop}
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose(null);
      }}
    >
      <section
        className={style.postImageViewer}
        role="dialog"
        aria-modal="true"
        aria-label="Full-size post image"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={style.postImageViewerClose}
          aria-label="Close image viewer"
          onClick={() => onClose(null)}
        >
          <RiCloseLine aria-hidden="true" />
        </button>
        <img src={image.src} alt={image.alt} />
      </section>
    </div>,
    document.body
  );
}
