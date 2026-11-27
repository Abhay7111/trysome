import { Link } from 'react-router';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

export default function UserSearchResults({ users }) {
  if (!users.length) {
    return (
      <div className={style.emptyState}>
        <h2>No users found</h2>
        <p>Try a different username.</p>
      </div>
    );
  }

  return (
    <div className={style.userResults}>
      {users.map((user) => (
        <Link className={style.userResult} to={`/users/${user.id}`} key={user.id}>
          <Avatar user={user} />
          <div>
            <strong>{user.username}</strong>
            <span>@{user.username}</span>
            {user.bio && <p>{user.bio}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
