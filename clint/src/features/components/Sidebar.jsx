import { useEffect, useState } from 'react';
import {
  RiAddLine,
  RiHome2Line,
  RiMessage3Line,
  RiNotification3Line,
  RiSearchLine,
  RiSettings3Line,
  RiTwitterXFill,
  RiUser3Line,
} from '@remixicon/react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useSocial } from '../social/useSocial';
import { fetchUnreadNotificationCount } from '../services/notifications.api';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { profile } = useSocial();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isProfile = pathname === '/profile' || pathname.startsWith('/users/');

  useEffect(() => {
    let active = true;
    const loadUnreadCount = () => {
      fetchUnreadNotificationCount()
        .then((result) => {
          if (active) setUnreadNotifications(result.unreadCount ?? 0);
        })
        .catch((requestError) => {
          console.error('Unable to load unread notification count', requestError);
        });
    };
    const handleNotificationsRead = () => setUnreadNotifications(0);

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 20000);
    window.addEventListener('notifications:read', handleNotificationsRead);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('notifications:read', handleNotificationsRead);
    };
  }, []);

  return (
    <aside className={style.sidebar}>
      <Link to="/home" className={style.brand} aria-label="Home">
        <RiTwitterXFill className={style.brandIcon} aria-hidden="true" />
      </Link>
      <nav className={style.navigation} aria-label="Main navigation">
        <Link to="/home" className={pathname === '/' || pathname === '/home' ? style.activeLink : ''}>
          <RiHome2Line className={style.navIcon} aria-hidden="true" /><span>Home</span>
        </Link>
        <Link to="/explore" className={pathname === '/explore' ? style.activeLink : ''}>
          <RiSearchLine className={style.navIcon} aria-hidden="true" /><span>Explore</span>
        </Link>
        <Link to="/chats" className={pathname === '/chats' ? style.activeLink : ''}>
          <RiMessage3Line className={style.navIcon} aria-hidden="true" /><span>Chats</span>
        </Link>
        <Link
          to="/notifications"
          className={`${style.notificationLink} ${pathname === '/notifications' ? style.activeLink : ''}`}
          aria-label={unreadNotifications
            ? `Notifications, ${unreadNotifications} unread`
            : 'Notifications'}
        >
          <span className={style.notificationNavIcon}>
            <RiNotification3Line className={style.navIcon} aria-hidden="true" />
            {unreadNotifications > 0 && (
              <span className={style.notificationNavBadge}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </span>
          <span>Notifications</span>
        </Link>
        <Link to="/profile" className={isProfile ? style.activeLink : ''}>
          <RiUser3Line className={style.navIcon} aria-hidden="true" /><span>Profile</span>
        </Link>
        <Link to="/settings" className={pathname === '/settings' ? style.activeLink : ''}>
          <RiSettings3Line className={style.navIcon} aria-hidden="true" /><span>Settings</span>
        </Link>
      </nav>
      <button
        type="button"
        className={style.postButton}
        onClick={() => navigate('/home?compose=1')}
      >
        <RiAddLine className={style.navIcon} aria-hidden="true" />
        <span>Post</span>
      </button>
      <Link to="/profile" className={style.account}>
        <Avatar user={profile} />
        <div>
          <strong>{profile.username}</strong>
          <span>@{profile.username}</span>
        </div>
      </Link>
    </aside>
  );
}
