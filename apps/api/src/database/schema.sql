CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  name varchar(255),
  role varchar(32) NOT NULL DEFAULT 'MEMBER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS scoring_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scoring_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES scoring_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  rules jsonb NOT NULL,
  max_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, version)
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name varchar(500) NOT NULL,
  website text,
  city varchar(255),
  category varchar(255),
  phone varchar(128),
  email varchar(320),
  telegram varchar(255),
  vk varchar(255),
  score smallint,
  score_grade varchar(16),
  status varchar(32) NOT NULL DEFAULT 'NEW',
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source varchar(64),
  source_external_id varchar(512),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (organization_id, source, source_external_id)
);

CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, tag)
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type varchar(64) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES scoring_profiles(id) ON DELETE SET NULL,
  profile_version_id uuid REFERENCES scoring_profile_versions(id) ON DELETE SET NULL,
  score smallint NOT NULL,
  grade varchar(16) NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status varchar(32) NOT NULL DEFAULT 'QUEUED',
  priority smallint NOT NULL DEFAULT 0,
  total_urls integer NOT NULL DEFAULT 0,
  processed_urls integer NOT NULL DEFAULT 0,
  failed_urls integer NOT NULL DEFAULT 0,
  max_pages_per_site smallint NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS crawl_job_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'QUEUED',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, url)
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_org_score ON leads(organization_id, score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_org_assignee ON leads(organization_id, assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_org_category ON leads(organization_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_tags_org_tag ON lead_tags(organization_id, tag);
CREATE INDEX IF NOT EXISTS idx_activities_lead_created ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_snapshots_lead_created ON lead_score_snapshots(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_org_created ON crawl_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_job_urls_job_status ON crawl_job_urls(job_id, status);
