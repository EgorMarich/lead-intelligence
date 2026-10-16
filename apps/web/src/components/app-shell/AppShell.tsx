'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Zap,
  Globe,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Target,
  Send,
  DollarSign,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useOrganizationStore } from '../../store/organization';
import styles from './AppShell.module.scss';
import { useI18n } from '../i18n/I18nProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const organizations = useOrganizationStore((s) => s.organizations);
  const activeOrganizationId = useOrganizationStore((s) => s.activeOrganizationId);
  const setActiveOrganization = useOrganizationStore((s) => s.setActiveOrganization);

  const { locale, setLocale, t } = useI18n();

  const active = organizations.find(
    (item) => item.organization.id === activeOrganizationId,
  );

  const nav = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/command-center', label: t('nav.sales'), icon: Zap },
    { href: '/discovery', label: t('nav.discovery'), icon: Target },
    { href: '/outreach', label: t('nav.outreach'), icon: Send },
    { href: '/sequences', label: t('nav.sequences'), icon: Send },
    { href: '/searches', label: t('nav.searches'), icon: Search },
    { href: '/leads', label: t('nav.leads'), icon: Building2 },
    { href: '/website', label: t('nav.website'), icon: Globe },
    { href: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { href: '/revenue', label: t('nav.revenue'), icon: DollarSign },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  function signOut() {
    logout();
    router.replace('/login');
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.logo}><Sparkles size={18} /></span>
          <span>Lead Intelligence</span>
        </Link>

        <div className={styles.org}>
          <div className={styles.orgLabel}>ОРГАНИЗАЦИЯ</div>
          <select
            value={activeOrganizationId ?? ''}
            onChange={(e) => setActiveOrganization(e.target.value)}
          >
            {organizations.map((item) => (
              <option key={item.organization.id} value={item.organization.id}>
                {item.organization.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.chevron} />
        </div>

        <nav className={styles.nav}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${
                pathname.startsWith(href) ? styles.active : ''
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.language}><button onClick={()=>setLocale(locale==='ru'?'en':'ru')} title="Language">{locale.toUpperCase()}</button></div>

        <div className={styles.account}>
          <div className={styles.avatar}>
            {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.accountInfo}>
            <strong>{user?.name ?? 'Пользователь'}</strong>
            <span>{active?.role ?? 'OWNER'}</span>
          </div>
          <button className={styles.iconButton} onClick={signOut} aria-label="Выйти">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
