import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LeadSignals, ScoreRule, ScoringProfile } from './lead-scoring.types';

@Injectable()
export class LeadScoringService {
  private readonly profiles = new Map<string, ScoringProfile>();

  listProfiles(organizationId: string) {
    return [...this.profiles.values()]
      .filter((p) => p.organizationId === organizationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getProfile(organizationId: string, id: string) {
    const profile = this.profiles.get(id);
    if (!profile || profile.organizationId !== organizationId) {
      throw new NotFoundException('Scoring profile not found');
    }
    return profile;
  }

  createProfile(organizationId: string, body: { name: string; description?: string; rules: ScoreRule[] }) {
    this.validateRules(body.rules);
    const now = new Date().toISOString();
    const profile: ScoringProfile = {
      id: randomUUID(),
      organizationId,
      name: body.name.trim(),
      description: body.description?.trim(),
      rules: body.rules,
      maxScore: body.rules.reduce((sum, rule) => sum + Math.max(0, Number(rule.points)), 0),
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  updateProfile(organizationId: string, id: string, body: { name?: string; description?: string; rules?: ScoreRule[] }) {
    const profile = this.getProfile(organizationId, id);
    if (body.rules) this.validateRules(body.rules);
    profile.name = body.name?.trim() || profile.name;
    profile.description = body.description?.trim() || profile.description;
    profile.rules = body.rules ?? profile.rules;
    profile.maxScore = profile.rules.reduce((sum, rule) => sum + Math.max(0, Number(rule.points)), 0);
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  score(organizationId: string, profileId: string, signals: LeadSignals) {
    const profile = this.getProfile(organizationId, profileId);
    let rawScore = 0;
    const reasons = profile.rules.map((rule) => {
      const matched = this.matches(rule.code, signals);
      if (matched) rawScore += Number(rule.points);
      return { ...rule, matched };
    });
    const score = profile.maxScore
      ? Math.max(0, Math.min(100, Math.round((rawScore / profile.maxScore) * 100)))
      : 0;

    return {
      profileId: profile.id,
      profileName: profile.name,
      score,
      grade: this.grade(score),
      rawScore,
      maxScore: profile.maxScore,
      reasons: reasons.filter((r) => r.matched).sort((a, b) => b.points - a.points),
      missedOpportunities: reasons.filter((r) => !r.matched && r.points > 0).sort((a, b) => b.points - a.points),
    };
  }

  private matches(code: string, s: LeadSignals) {
    switch (code) {
      case 'HAS_WEBSITE': return Boolean(s.hasWebsite);
      case 'NO_ONLINE_BOOKING': return s.hasOnlineBooking === false;
      case 'HAS_EMAIL': return Boolean(s.hasEmail);
      case 'HAS_PHONE': return Boolean(s.hasPhone);
      case 'HAS_TELEGRAM': return Boolean(s.hasTelegram);
      case 'HAS_VK': return Boolean(s.hasVk);
      case 'HAS_WHATSAPP': return Boolean(s.hasWhatsApp);
      case 'HAS_INSTAGRAM': return Boolean(s.hasInstagram);
      case 'GOOD_RATING': return Number(s.rating ?? 0) >= 4.5;
      case 'MANY_REVIEWS': return Number(s.reviewsCount ?? 0) >= 100;
      case 'LARGE_TEAM': return Number(s.employeesCount ?? 0) >= 10;
      case 'BUSINESS_FIT': return Number(s.businessFit ?? 0) >= 20;
      case 'DIGITAL_PRESENCE': return Number(s.digitalPresence ?? 0) >= 20;
      case 'CONTACTABILITY': return Number(s.contactability ?? 0) >= 15;
      case 'SALES_POTENTIAL': return Number(s.salesPotential ?? 0) >= 15;
      default: return false;
    }
  }

  private grade(score: number) {
    if (score >= 90) return 'HOT';
    if (score >= 70) return 'WARM';
    if (score >= 40) return 'COLD';
    return 'LOW';
  }

  private validateRules(rules: ScoreRule[]) {
    if (!Array.isArray(rules) || !rules.length) throw new BadRequestException('At least one scoring rule is required');
    for (const rule of rules) {
      if (!rule.code || !rule.label || !rule.reason) throw new BadRequestException('Each rule requires code, label and reason');
      if (!Number.isFinite(Number(rule.points)) || Number(rule.points) < 0) throw new BadRequestException('Rule points must be non-negative');
    }
  }
}
