import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import { REQUIRED_PERMISSION } from './authorization.decorator';
import { Permission } from './permission';
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector:Reflector, private readonly authorization:AuthorizationService) {}
  async canActivate(context:ExecutionContext) {
    const permission=this.reflector.getAllAndOverride<Permission>(REQUIRED_PERMISSION,[context.getHandler(),context.getClass()]);
    if(!permission) return true;
    const request=context.switchToHttp().getRequest();
    const userId=request.user?.sub;
    const organizationId=request.organizationId||request.params?.organizationId||request.headers['x-organization-id'];
    if(!userId||!organizationId) throw new ForbiddenException('Organization context is required');
    request.organizationId=organizationId;
    request.organizationMembership=await this.authorization.requirePermission(userId,organizationId,permission);
    return true;
  }
}
