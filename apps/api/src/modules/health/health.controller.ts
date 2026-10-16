import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import IORedis from 'ioredis';

@Controller('health')
export class HealthController {
  private readonly redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });

  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async health() {
    const checks = { database: false, redis: false };
    try { await this.dataSource.query('SELECT 1'); checks.database = true; } catch {}
    try { if (this.redis.status === 'wait') await this.redis.connect(); await this.redis.ping(); checks.redis = true; } catch {}
    const healthy = checks.database && checks.redis;
    return { status: healthy ? 'ok' : 'degraded', service: 'lead-intelligence-api', version: '0.25.0', checks, uptimeSeconds: Math.round(process.uptime()) };
  }
}
