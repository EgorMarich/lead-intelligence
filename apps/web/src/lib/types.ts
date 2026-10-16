export type User = {
  id: string;
  email: string;
  name: string;
  status: string;
  emailVerified: boolean;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
};

export type OrganizationMembership = {
  organization: Organization;
  role: 'VIEWER' | 'ANALYST' | 'MANAGER' | 'ADMIN' | 'OWNER';
};

export type SearchFilterCondition = { field: string; operator: string; value?: string | number | boolean | string[] | number[] };
export type SearchJobFilters = { version?: number; root?: { logic: 'AND' | 'OR'; conditions: SearchFilterCondition[]; groups?: unknown[] } } & Record<string, unknown>;

export type SearchJob = {
  id: string;
  organizationId: string;
  source: string;
  query?: string;
  cityId?: string;
  categoryId?: string;
  filters: SearchJobFilters;
  limit: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalFound: number;
  processed: number;
  errors: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  createdAt: string;
};

export type RawLead = {
  id: string;
  organizationId: string;
  searchJobId: string;
  source: string;
  externalId?: string;
  name: string;
  category?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewsCount: number;
  sourceUrl?: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
};

export type LeadGrade = 'HOT' | 'WARM' | 'COLD' | 'LOW';
export type QualifiedBusiness = {
  business: { id: string; name: string; city: string; address?: string; website?: string; rating?: number; reviewsCount: number; categoryId?: string };
  score: { score: number; grade: LeadGrade; reasons: { code: string; points: number; description: string }[] } | null;
};
