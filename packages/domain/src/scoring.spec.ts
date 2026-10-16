import { calculateLeadScore, LeadGrade } from './index';

describe('lead scoring', () => {
  it('scores a business without booking as hot when strong signals exist', () => {
    const result = calculateLeadScore({
      hasOnlineBooking: false,
      hasWebsite: true,
      hasTelegram: true,
      hasVk: true,
      hasWhatsapp: false,
      hasEmail: true,
      reviewsCount: 500,
      employeeCount: 5,
    });

    expect(result.score).toBe(100);
    expect(result.grade).toBe(LeadGrade.HOT);
    expect(result.reasons.some((r) => r.code === 'NO_ONLINE_BOOKING')).toBe(true);
  });
});
