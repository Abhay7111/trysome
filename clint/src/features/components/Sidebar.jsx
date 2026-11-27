import {
  RiAddLine,
  RiHome2Line,
  RiMessage3Line,
  RiSearchLine,
  RiSettings3Line,
  RiTwitterXFill,
  RiUser3Line,
} from '@remixicon/react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useSocial } from '../social/useSocial';
import Avatar from './Avatar';
import style from '../pages/Social.module.scss';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { profile } = useSocial();
  const navigate = useNavigate();
  const isProfile = pathname === '/profile' || pathname.startsWith('/users/');

  return (
    <aside className={style.sidebar}>
      <Link to="/home" className={style.brand} aria-label="Home">
        <RiTwitterXFill className={style.brandIcon} aria-hidden="true" />
      </Link>
      <nav className={style.navigation} aria-label="Main navigation">
        <Link to="/home" className={pathname === '/' || pathname === '/home' ? style.activeLink : ''}>
          <RiHome2Line className={style.navIcon} aria-hidden="true" /> Home
        </Link>
        <Link to="/explore" className={pathname === '/explore' ? style.activeLink : ''}>
          <RiSearchLine className={style.navIcon} aria-hidden="true" /> Explore
        </Link>
        <Link to="/chats" className={pathname === '/chats' ? style.activeLink : ''}>
          <RiMessage3Line className={style.navIcon} aria-hidden="true" /> Chats
        </Link>
        <Link to="/profile" className={isProfile ? style.activeLink : ''}>
          <RiUser3Line className={style.navIcon} aria-hidden="true" /> Profile
        </Link>
        <Link to="/settings" className={pathname === '/settings' ? style.activeLink : ''}>
          <RiSettings3Line className={style.navIcon} aria-hidden="true" /> Settings
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
