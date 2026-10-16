export enum Permission {
  ORGANIZATION_READ = 'organization:read', ORGANIZATION_UPDATE = 'organization:update',
  MEMBERS_READ = 'members:read', MEMBERS_MANAGE = 'members:manage',
  BILLING_READ = 'billing:read', BILLING_MANAGE = 'billing:manage',
  BUSINESS_READ = 'business:read', BUSINESS_WRITE = 'business:write',
  SEARCH_READ = 'search:read', SEARCH_RUN = 'search:run',
  EXPORT_RUN = 'export:run', ANALYTICS_READ = 'analytics:read',
}
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  VIEWER: [Permission.ORGANIZATION_READ,Permission.MEMBERS_READ,Permission.BILLING_READ,Permission.BUSINESS_READ,Permission.SEARCH_READ,Permission.ANALYTICS_READ],
  ANALYST: [Permission.ORGANIZATION_READ,Permission.MEMBERS_READ,Permission.BILLING_READ,Permission.BUSINESS_READ,Permission.SEARCH_READ,Permission.ANALYTICS_READ,Permission.EXPORT_RUN],
  MANAGER: [Permission.ORGANIZATION_READ,Permission.MEMBERS_READ,Permission.BILLING_READ,Permission.BUSINESS_READ,Permission.BUSINESS_WRITE,Permission.SEARCH_READ,Permission.SEARCH_RUN,Permission.EXPORT_RUN,Permission.ANALYTICS_READ],
  ADMIN: [Permission.ORGANIZATION_READ,Permission.ORGANIZATION_UPDATE,Permission.MEMBERS_READ,Permission.MEMBERS_MANAGE,Permission.BILLING_READ,Permission.BILLING_MANAGE,Permission.BUSINESS_READ,Permission.BUSINESS_WRITE,Permission.SEARCH_READ,Permission.SEARCH_RUN,Permission.EXPORT_RUN,Permission.ANALYTICS_READ],
  OWNER: Object.values(Permission),
};
