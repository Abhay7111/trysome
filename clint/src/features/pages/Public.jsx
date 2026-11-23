import React from 'react';
import style from '../../shared/style/public.module.scss';
import Public_component from '../../shared/components/Public.component';
import Nav_component from '../../shared/components/Nav.component';
import PublicActivity_component from '../../shared/components/PublicActivity.component';

function Public() {
  return (
    <main className={style.main}>
        <div className={style.nav}><Nav_component/></div>
        <div className={style.public}><Public_component/></div>
        <div className={style.publicActivity}><PublicActivity_component/>asd</div>
    </main>
  )
}

export default Public
