'use client';

import { create } from 'zustand';
import type { OrganizationMembership } from '../lib/types';

type OrganizationState = {
  organizations: OrganizationMembership[];
  activeOrganizationId: string | null;
  setOrganizations: (items: OrganizationMembership[]) => void;
  setActiveOrganization: (id: string) => void;
};

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  activeOrganizationId:
    typeof window !== 'undefined'
      ? localStorage.getItem('lead_organization_id')
      : null,
  setOrganizations: (organizations) => set({ organizations }),
  setActiveOrganization: (id) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lead_organization_id', id);
    }
    set({ activeOrganizationId: id });
  },
}));
