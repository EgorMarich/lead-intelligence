import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly auth: AuthService) {}

  use(req: Request & { user?: any }, _res: Response, next: NextFunction) {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    if (sessionId) req.user = this.auth.resolveSession(sessionId);
    next();
  }
}
