'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrganizations, updateOrganization } from '../../../lib/api';
import styles from '../app.module.scss';
import { useOrganizationStore } from '../../../store/organization';

export default function SettingsPage() {
  const setOrganizations = useOrganizationStore((s) => s.setOrganizations);
  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations });
  return (
    <div className={styles.page}>
      <header className={styles.header}><div><div className={styles.eyebrow}>WORKSPACE</div><h1>Настройки</h1><p>Организации и доступы рабочего пространства.</p></div></header>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Ваши организации</h2><p>Роли участников доступны через backend RBAC.</p></div></div>
        <div className={styles.settingsList}>{orgs.map(item => <div className={styles.settingRow} key={item.organization.id}><div><strong>{item.organization.name}</strong><span>{item.organization.slug}</span></div><b>{item.role}</b></div>)}</div>
      </section>
      {orgs[0] && <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Globalization</h2><p>Язык, валюта и часовой пояс организации.</p></div></div>
        <div className={styles.formRow}>
          <select className={styles.input} defaultValue={orgs[0].organization.languageCode ?? 'ru'} onChange={async e => { const o=await updateOrganization(orgs[0].organization.id,{languageCode:e.target.value}); setOrganizations(orgs.map(x=>x.organization.id===o.id?{...x,organization:o}:x)); }}><option value="ru">Русский</option><option value="en">English</option></select>
          <select className={styles.input} defaultValue={orgs[0].organization.currencyCode ?? 'RUB'} onChange={async e => { const o=await updateOrganization(orgs[0].organization.id,{currencyCode:e.target.value}); setOrganizations(orgs.map(x=>x.organization.id===o.id?{...x,organization:o}:x)); }}><option value="RUB">RUB</option><option value="EUR">EUR</option><option value="USD">USD</option></select>
          <input className={styles.input} defaultValue={orgs[0].organization.timezone ?? 'Europe/Moscow'} placeholder="Europe/Moscow" onBlur={async e => { if(!e.target.value)return; const o=await updateOrganization(orgs[0].organization.id,{timezone:e.target.value}); setOrganizations(orgs.map(x=>x.organization.id===o.id?{...x,organization:o}:x)); }} />
        </div>
      </section>
    </div>
  );
}
