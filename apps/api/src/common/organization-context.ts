import { ForbiddenException } from '@nestjs/common';

export function organizationIdFromRequest(req: any): string {
  if (req.user?.organizationId) return String(req.user.organizationId);
  if (req.headers?.['x-organization-id']) return String(req.headers['x-organization-id']);
  throw new ForbiddenException('Organization context is required');
}
