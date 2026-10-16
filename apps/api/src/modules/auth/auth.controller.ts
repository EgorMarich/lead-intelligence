import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('session')
  create(@Body() body: { organizationId: string; email: string; role?: Role; userId?: string }) {
    return this.auth.createSession({
      organizationId: body.organizationId,
      email: body.email,
      role: body.role ?? 'MEMBER',
      id: body.userId,
    });
  }

  @Post('logout')
  logout(@Req() req: any) {
    const id = req.headers['x-session-id'];
    if (id) this.auth.revokeSession(String(id));
    return { ok: true };
  }
}
