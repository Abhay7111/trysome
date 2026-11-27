import style from '../pages/Social.module.scss';

export default function Avatar({ user, className = '' }) {
  const username = user?.username ?? '';

  return (
    <div className={`${style.avatar} ${className}`}>
      {user?.profile_img
        ? <img src={user.profile_img} alt={`${username}'s profile`} />
        : <span>{username.charAt(0).toUpperCase() || '?'}</span>}
    </div>
  );
}
