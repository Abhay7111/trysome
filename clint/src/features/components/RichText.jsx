import { Link } from 'react-router';
import style from '../pages/Social.module.scss';

const tokens = /(^|[\s([{,;:!?])(@[A-Za-z0-9_.-]+|#[A-Za-z0-9_]+)/g;

export default function RichText({ children }) {
  const text = String(children ?? '');
  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokens)) {
    const tokenStart = match.index + match[1].length;
    const token = match[2];
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
