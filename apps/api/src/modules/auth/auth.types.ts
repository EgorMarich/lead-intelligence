export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: ['*'],
  ADMIN: ['organization:read','organization:update','users:read','users:write','leads:read','leads:write','leads:export','scoring:read','scoring:write','crawl:read','crawl:write'],
  MANAGER: ['users:read','leads:read','leads:write','leads:export','scoring:read','scoring:write','crawl:read','crawl:write'],
  MEMBER: ['leads:read','leads:write','leads:export','scoring:read','crawl:read'],
  VIEWER: ['leads:read','scoring:read','crawl:read'],
};

export type AuthUser = {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
};
