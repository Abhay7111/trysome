import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import Avatar from '../components/Avatar';
import { useSocial } from '../social/useSocial';
import { fetchNotifications, markNotificationsRead } from '../services/notifications.api';
import style from './Social.module.scss';

function getNotificationText(notification) {
  const username = notification.actor?.username ?? 'Someone';
  switch (notification.type) {
    case 'tag':
      return `${username} mentioned you in a post`;
    case 'like':
      return `${username} liked your post`;
    case 'follow':
      return `${username} started following you`;
    case 'message':
      return `${username} sent you a message`;
    default:
      return 'You have a new notification';
  }
}

function getNotificationLink(notification, currentUserId) {
  if (notification.type === 'message' && notification.conversationId) {
    return `/chats?conversation=${encodeURIComponent(notification.conversationId)}`;
  }
  if (notification.postId && notification.postAuthorId) {
    if (notification.postAuthorId === String(currentUserId)) {
      return `/profile?post=${encodeURIComponent(notification.postId)}`;
    }
    return `/users/${notification.postAuthorId}?post=${encodeURIComponent(notification.postId)}`;
  }
  return notification.actor?.id ? `/users/${notification.actor.id}` : '/notifications';
}

export default function NotificationsPage() {
  const { profile } = useSocial();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const processedInitialUnread = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await fetchNotifications();
      setNotifications(result.notifications ?? []);
      setError('');
      if (!processedInitialUnread.current) {
        if (result.unreadCount > 0) {
          await markNotificationsRead();
          setNotifications((current) => current.map((notification) => ({
            ...notification,
            read: true,
          })));
          window.dispatchEvent(new Event('notifications:read'));
        }
        processedInitialUnread.current = true;
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? 'Unable to load notifications.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(loadNotifications, 0);
    const intervalId = window.setInterval(loadNotifications, 20000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  return (
    <>
      <header className={style.header}>
        <h1>Notifications</h1>
      </header>
      {error && <p className={style.errorBanner} role="alert">{error}</p>}
      {loading && <p className={style.status}>Loading notifications...</p>}
      {!loading && !error && !notifications.length && (
        <section className={style.notificationEmpty}>
          <h2>You’re all caught up</h2>
          <p>Likes, follows, mentions, and messages will show up here.</p>
        </section>
      )}
      <div className={style.notificationList}>
        {notifications.map((notification) => (
          <Link
            to={getNotificationLink(notification, profile.id)}
            className={`${style.notificationItem} ${notification.read ? '' : style.unreadNotification}`}
            key={notification.id}
          >
            <Avatar
              user={notification.actor}
              className={style.notificationAvatar}
            />
            <span className={style.notificationBody}>
              <span>{getNotificationText(notification)}</span>
              <time dateTime={notification.createdAt}>
                {new Date(notification.createdAt).toLocaleString()}
              </time>
            </span>
            {!notification.read && (
              <span className={style.notificationUnreadDot} aria-label="Unread" />
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
