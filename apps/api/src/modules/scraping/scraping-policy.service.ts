import { Injectable } from '@nestjs/common';

@Injectable()
export class ScrapingPolicyService {
  private readonly lastRequest = new Map<string, number>();

  async wait(key: string, minDelayMs = 800) {
    const now = Date.now();
    const previous = this.lastRequest.get(key) ?? 0;
    const waitMs = Math.max(0, minDelayMs - (now - previous));

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.lastRequest.set(key, Date.now());
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    options: { attempts?: number; baseDelayMs?: number } = {},
  ): Promise<T> {
    const attempts = options.attempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)),
        );
      }
    }

    throw lastError;
  }
}
