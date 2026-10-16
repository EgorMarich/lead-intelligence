export enum BusinessStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN',
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum LeadGrade {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  LOW = 'LOW',
}

export enum ContactType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  TELEGRAM = 'TELEGRAM',
  VK = 'VK',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  OTHER = 'OTHER',
}

export const LEAD_SCORE_RULES = {
  NO_ONLINE_BOOKING: 30,
  HAS_WEBSITE: 10,
  HAS_TELEGRAM: 10,
  HAS_VK: 10,
  HAS_WHATSAPP: 5,
  REVIEWS_100: 10,
  REVIEWS_500: 15,
  MULTIPLE_EMPLOYEES: 10,
  HAS_EMAIL: 5,
} as const;

export function gradeForScore(score: number): LeadGrade {
  if (score >= 90) return LeadGrade.HOT;
  if (score >= 70) return LeadGrade.WARM;
  if (score >= 40) return LeadGrade.COLD;
  return LeadGrade.LOW;
}

export interface ScoreReason {
  code: keyof typeof LEAD_SCORE_RULES;
  points: number;
  description: string;
}

export interface ScoreInput {
  hasOnlineBooking: boolean;
  hasWebsite: boolean;
  hasTelegram: boolean;
  hasVk: boolean;
  hasWhatsapp: boolean;
  hasEmail: boolean;
  reviewsCount: number;
  employeeCount?: number;
}

export function calculateLeadScore(input: ScoreInput) {
  const reasons: ScoreReason[] = [];
  let score = 0;

  const add = (code: ScoreReason['code'], condition: boolean, description: string) => {
    if (condition) {
      const points = LEAD_SCORE_RULES[code];
      score += points;
      reasons.push({ code, points, description });
    }
  };

  add('NO_ONLINE_BOOKING', !input.hasOnlineBooking, 'У бизнеса не обнаружена онлайн-запись');
  add('HAS_WEBSITE', input.hasWebsite, 'Есть собственный сайт');
  add('HAS_TELEGRAM', input.hasTelegram, 'Есть Telegram');
  add('HAS_VK', input.hasVk, 'Есть VK');
  add('HAS_WHATSAPP', input.hasWhatsapp, 'Есть WhatsApp');
  add('REVIEWS_100', input.reviewsCount >= 100, 'Более 100 отзывов');
  add('REVIEWS_500', input.reviewsCount >= 500, 'Более 500 отзывов');
  add('MULTIPLE_EMPLOYEES', (input.employeeCount ?? 0) > 1, 'Обнаружено несколько сотрудников');
  add('HAS_EMAIL', input.hasEmail, 'Есть email');

  score = Math.min(score, 100);
  return { score, grade: gradeForScore(score), reasons };
}
