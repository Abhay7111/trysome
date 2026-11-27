import { Link } from 'react-router';
import style from '../pages/Social.module.scss';

const tokens = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)|(^|[\s([{,;:!?])(@[A-Za-z0-9_.-]+|#[A-Za-z0-9_]+)/gi;

function getSafeHref(value) {
  const href = value.toLowerCase().startsWith('www.') ? `https://${value}` : value;
  try {
    const protocol = new URL(href).protocol;
    return protocol === 'http:' || protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
}

export default function RichText({ children }) {
  const text = String(children ?? '');
  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokens)) {
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    if (match[1]) {
      const href = getSafeHref(match[2]);
      if (!href) {
        parts.push(match[0]);
      } else {
        parts.push(
          <a
            key={`${start}-${match[2]}`}
            className={style.externalLink}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {match[1]}
          </a>
        );
      }
      lastIndex = start + match[0].length;
      continue;
    }

    if (match[3]) {
      const urlText = match[3];
      const displayText = urlText.replace(/[.,!?;:]+$/, '');
      const href = getSafeHref(displayText);
      if (href) {
        parts.push(
          <a
            key={`${start}-${displayText}`}
            className={style.externalLink}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {displayText}
          </a>
        );
        parts.push(urlText.slice(displayText.length));
      } else {
        parts.push(match[0]);
      }
      lastIndex = start + match[0].length;
      continue;
    }

    const tokenStart = start + match[4].length;
    const token = match[5];
    if (tokenStart > lastIndex) {
      parts.push(text.slice(lastIndex, tokenStart));
    }
    const isMention = token.startsWith('@');
    const tokenValue = token.slice(1);
    parts.push(
      <Link
        key={`${tokenStart}-${token}`}
        className={isMention ? style.mentionLink : style.hashtagLink}
        to={isMention
          ? `/users/${encodeURIComponent(tokenValue)}`
          : `/explore?type=tags&q=${encodeURIComponent(tokenValue)}`}
        onClick={(event) => event.stopPropagation()}
      >
        {token}
      </Link>
    );
    lastIndex = tokenStart + token.length;
  }

  parts.push(text.slice(lastIndex));
  return parts;
}
