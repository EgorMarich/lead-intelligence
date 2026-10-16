import { SetMetadata } from '@nestjs/common';
import { Permission } from './permission';
export const REQUIRED_PERMISSION = 'required_permission';
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);
