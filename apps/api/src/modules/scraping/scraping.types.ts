export interface ScrapeRequest {
  searchJobId: string;
  organizationId: string;
  source: string;
  query: string;
  city?: string;
  category?: string;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface ScrapedLead {
  externalId?: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialLinks?: string[];
  source: string;
  sourceUrl?: string;
  raw: Record<string, unknown>;
}
