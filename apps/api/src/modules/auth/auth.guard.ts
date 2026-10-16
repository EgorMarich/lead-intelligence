import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './auth.types';
@Injectable()
export class JwtAuthGuard implements CanActivate {
 constructor(private readonly jwt:JwtService) {}
 canActivate(context:ExecutionContext):boolean {
  const req=context.switchToHttp().getRequest<AuthenticatedRequest & {headers:Record<string,string>}>();
  const header=req.headers.authorization;
  if(!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required');
  try { req.user=this.jwt.verify(header.slice(7)); return true; } catch { throw new UnauthorizedException('Invalid or expired access token'); }
 }
}
