import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { RiMoonLine, RiSunLine } from '@remixicon/react';
import { logout, updateProfilePrivacy } from '../auth/services/auth.api';
import { useSocial } from '../social/useSocial';
import { getTheme, toggleTheme } from '../../shared/components/Theme.component';
import Avatar from '../components/Avatar';
import { fetchFollowRequests, respondToFollowRequest } from '../services/users.api';
import style from './Social.module.scss';

export default function SettingsPage() {
  const {
    profile,
    setProfile,
    blockedUsers,
    pendingUserIds,
    toggleUserBlock,
  } = useSocial();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getTheme);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [respondingIds, setRespondingIds] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchFollowRequests()
      .then((result) => {
        if (active) setFollowRequests(result.requests ?? []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ?? 'Unable to load follow requests.'
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePrivacyToggle = async () => {
    setError('');
    setUpdatingPrivacy(true);
    try {
      const result = await updateProfilePrivacy(!profile.isPrivate);
      setProfile((current) => ({ ...current, isPrivate: result.isPrivate }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? 'Unable to update profile privacy.'
      );
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to log out.');
    }
  };

  const handleFollowRequest = async (userId, accept) => {
    setError('');
    setRespondingIds((current) => new Set(current).add(userId));
    try {
      await respondToFollowRequest(userId, accept);
      setFollowRequests((current) => current.filter((request) => request.id !== userId));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? 'Unable to respond to follow request.'
      );
    } finally {
      setRespondingIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <>
      <header className={style.header}><h1>Settings</h1></header>
      <section className={style.settingsPage}>
        <article className={style.settingsCard}>
          <h2>Appearance</h2>
          <p>Choose how Trysome looks on this device.</p>
          <button
            type="button"
            className={style.settingsButton}
            onClick={() => setTheme(toggleTheme())}
          >
            {theme === 'dark'
              ? <RiSunLine className={style.navIcon} aria-hidden="true" />
              : <RiMoonLine className={style.navIcon} aria-hidden="true" />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} theme
          </button>
        </article>
        <article className={style.settingsCard}>
          <h2>Privacy</h2>
          <label className={style.privacySetting}>
            <span>
              <strong>Private profile</strong>
              <small>
                {profile.isPrivate
                  ? 'Your profile and posts are hidden from public feeds.'
                  : 'Your public posts can be seen by everyone.'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(profile.isPrivate)}
              disabled={updatingPrivacy}
              onChange={handlePrivacyToggle}
            />
          </label>
        </article>
        <article className={style.settingsCard}>
          <h2>Follow requests</h2>
          {loadingRequests
            ? <p>Loading follow requests...</p>
            : followRequests.length
              ? followRequests.map((request) => (
                <div className={style.followRequest} key={request.id}>
                  <Avatar user={request} />
                  <strong>@{request.username}</strong>
                  <button
                    type="button"
                    disabled={respondingIds.has(request.id)}
                    onClick={() => handleFollowRequest(request.id, false)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={respondingIds.has(request.id)}
                    onClick={() => handleFollowRequest(request.id, true)}
                  >
                    Accept
                  </button>
                </div>
              ))
              : <p>No pending follow requests.</p>}
        </article>
        <article className={style.settingsCard}>
          <h2>Your account</h2>
          <p><strong>{profile.username}</strong></p>
          <p>{profile.email}</p>
          <Link to="/profile" className={style.settingsLink}>View your profile</Link>
          <Link to="/login" className={style.settingsLink}>Log in with another account</Link>
          <button
            type="button"
            className={style.logoutButton}
            onClick={handleLogout}
          >
            Log out
          </button>
        </article>
        <article className={style.settingsCard}>
          <h2>Blocked accounts</h2>
          {blockedUsers.length ? blockedUsers.map((blockedUser) => (
            <div className={style.blockedUser} key={blockedUser.id}>
              <Avatar user={blockedUser} />
              <strong>@{blockedUser.username}</strong>
              <button
                type="button"
                disabled={pendingUserIds.has(blockedUser.id)}
                onClick={() => toggleUserBlock(blockedUser.id, blockedUser)}
              >
                Unblock
              </button>
            </div>
          )) : <p>You haven’t blocked anyone.</p>}
        </article>
        {error && <p className={style.errorBanner} role="alert">{error}</p>}
      </section>
    </>
  );
}
