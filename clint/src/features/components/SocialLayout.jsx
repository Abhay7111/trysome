import { Outlet } from 'react-router';
import { useSocial } from '../social/useSocial';
import Sidebar from './Sidebar';
import RightRail from './RightRail';
import style from '../pages/Social.module.scss';

export default function SocialLayout() {
  const { isLoading, loadError, interactionError } = useSocial();

  if (isLoading) {
    return <main className={style.status}>Loading your account...</main>;
  }

  if (loadError) {
    return <main className={style.status} role="alert">{loadError}</main>;
  }

  return (
    <main className={style.shell}>
      <Sidebar />
      <section className={style.content}>
        {interactionError && (
          <p className={style.errorBanner} role="alert">
            {interactionError}
          </p>
        )}
        <Outlet />
      </section>
      <RightRail />
    </main>
  );
}
