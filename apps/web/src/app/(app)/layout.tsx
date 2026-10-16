'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../components/app-shell/AppShell';
import { getOrganizations } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useOrganizationStore } from '../../store/organization';
import { I18nProvider } from '../../components/i18n/I18nProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const organizations = useOrganizationStore((s) => s.organizations);
  const setOrganizations = useOrganizationStore((s) => s.setOrganizations);
  const activeOrganizationId = useOrganizationStore((s) => s.activeOrganizationId);
  const setActiveOrganization = useOrganizationStore((s) => s.setActiveOrganization);

  useEffect(() => {
    if (!hydrated) return;
    const token = localStorage.getItem('lead_access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    getOrganizations()
      .then((items) => {
        setOrganizations(items);
        if (!activeOrganizationId && items[0]) {
          setActiveOrganization(items[0].organization.id);
        }
      })
      .catch(() => router.replace('/login'));
  }, [hydrated, router, activeOrganizationId, setActiveOrganization, setOrganizations, setUser, user]);

  if (!hydrated || !user && typeof window !== 'undefined' && !localStorage.getItem('lead_access_token')) {
    return null;
  }

  return <I18nProvider><AppShell>{children}</AppShell></I18nProvider>;
}
