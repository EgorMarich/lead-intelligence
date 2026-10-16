import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from './auth.types';

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, AuthUser>();

  createSession(input: Omit<AuthUser, 'id'> & { id?: string }) {
    const sessionId = randomUUID();
    const user: AuthUser = {
      id: input.id ?? randomUUID(),
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
    };
    this.sessions.set(sessionId, user);
    return { sessionId, user };
  }

  resolveSession(sessionId?: string) {
    if (!sessionId) throw new UnauthorizedException('Authentication required');
    const user = this.sessions.get(sessionId);
    if (!user) throw new UnauthorizedException('Invalid session');
    return user;
  }

  revokeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}
