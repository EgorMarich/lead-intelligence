import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface YooPayment {
  id: string;
  status: string;
  paid?: boolean;
  amount?: { value: string; currency: string };
  confirmation?: { type?: string; confirmation_url?: string };
  payment_method?: { id?: string; saved?: boolean; type?: string };
  metadata?: Record<string, string>;
}

@Injectable()
export class YooKassaClient {
  private get shopId() { return process.env.YOOKASSA_SHOP_ID ?? ''; }
  private get secretKey() { return process.env.YOOKASSA_SECRET_KEY ?? ''; }
  private get baseUrl() { return process.env.YOOKASSA_API_URL ?? 'https://api.yookassa.ru/v3'; }

  private ensureConfigured() {
    if (!this.shopId || !this.secretKey) throw new ServiceUnavailableException('Payment provider is not configured');
  }

  private headers(idempotencyKey?: string) {
    const basic = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotencyKey ?? randomUUID(),
    };
  }

  private async request(path: string, init: RequestInit, idempotencyKey?: string): Promise<YooPayment> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(idempotencyKey), ...(init.headers ?? {}) },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`Payment provider error: ${response.status}${body ? ` ${body.slice(0, 300)}` : ''}`);
    }
    return response.json() as Promise<YooPayment>;
  }

  async createPayment(input: {
    amountRub: number;
    description: string;
    returnUrl?: string;
    metadata: Record<string, string>;
    savePaymentMethod?: boolean;
    paymentMethodId?: string;
    idempotencyKey: string;
  }): Promise<YooPayment> {
    const body: Record<string, unknown> = {
      amount: { value: input.amountRub.toFixed(2), currency: 'RUB' },
      capture: true,
      description: input.description,
      metadata: input.metadata,
    };
    if (input.returnUrl) body.confirmation = { type: 'redirect', return_url: input.returnUrl };
    if (input.savePaymentMethod) body.save_payment_method = true;
    if (input.paymentMethodId) body.payment_method_id = input.paymentMethodId;
    return this.request('/payments', { method: 'POST', body: JSON.stringify(body) }, input.idempotencyKey);
  }

  async getPayment(id: string): Promise<YooPayment> {
    return this.request(`/payments/${encodeURIComponent(id)}`, { method: 'GET' });
  }
}
