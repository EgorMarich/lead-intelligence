export type ScoreRule = {
  code: string;
  label: string;
  points: number;
  reason: string;
};

export type ScoringProfile = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  rules: ScoreRule[];
  maxScore: number;
  createdAt: string;
  updatedAt: string;
};

export type LeadSignals = {
  businessFit?: number;
  digitalPresence?: number;
  contactability?: number;
  salesPotential?: number;
  hasWebsite?: boolean;
  hasOnlineBooking?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasTelegram?: boolean;
  hasVk?: boolean;
  hasWhatsApp?: boolean;
  hasInstagram?: boolean;
  rating?: number;
  reviewsCount?: number;
  employeesCount?: number;
};
