#!/usr/bin/env node
/**
 * Lead Intelligence staging smoke test.
 * Requires Node 20+ and a running API. No external npm dependencies.
 *
 * Usage:
 *   API_URL=http://localhost:3000/api/v1 node scripts/staging-smoke.mjs
 *   SMOKE_RUN_CRAWL=true node scripts/staging-smoke.mjs
 */

const API_URL = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const RUN_CRAWL = /^(1|true|yes)$/i.test(process.env.SMOKE_RUN_CRAWL || 'false');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);
const crawlPollMs = Number(process.env.SMOKE_CRAWL_POLL_MS || 5000);
const crawlTimeoutMs = Number(process.env.SMOKE_CRAWL_TIMEOUT_MS || 60000);

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userA = {
  name: `Staging Smoke A ${runId}`,
  email: `staging-smoke-a-${runId}@example.test`,
  password: 'StagingSmoke!2026Aa1',
  organizationName: `Staging Smoke A ${runId}`,
};
const userB = {
  name: `Staging Smoke B ${runId}`,
  email: `staging-smoke-b-${runId}@example.test`,
  password: 'StagingSmoke!2026Bb1',
  organizationName: `Staging Smoke B ${runId}`,
};

let passed = 0;
let failed = 0;

function log(ok, name, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(path, { method = 'GET', body, cookies = [], orgId, expected = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookies.length) headers.cookie = cookies.join('; ');
    if (orgId) headers['x-organization-id'] = orgId;
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      redirect: 'manual',
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/).filter(Boolean);
    if (expected !== null && response.status !== expected) {
      throw new Error(`expected HTTP ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
    }
    return { response, data, setCookies };
  } finally {
    clearTimeout(timer);
  }
}

function cookieNames(setCookies) {
  return setCookies.map((value) => value.split(';', 1)[0]);
}

async function register(user) {
  const result = await request('/auth/register', { method: 'POST', body: user, expected: 201 });
  const cookies = cookieNames(result.setCookies);
  if (cookies.length < 2) throw new Error(`expected access + refresh cookies, got ${cookies.length}`);
  return { ...result.data, cookies };
}

async function main() {
  console.log(`Lead Intelligence staging smoke — ${API_URL}`);
  console.log(`crawl execution: ${RUN_CRAWL ? 'enabled' : 'disabled'}`);
  console.log('');

  const health = await request('/health/ready', { expected: 200 });
  log(health.data?.status === 'ready', 'API readiness', JSON.stringify(health.data));

  const plans = await request('/billing/plans', { expected: 200 });
  log(Array.isArray(plans.data?.data), 'Public billing plans', `${plans.data?.data?.length ?? 0} active plan(s)`);

  const a = await register(userA);
  log(Boolean(a.user?.id && a.organization?.id), 'Register account A', a.user?.email);
  log(a.organization?.id === a.user?.organizationId, 'Account A tenant binding');

  const meA = await request('/auth/me', { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
  log(meA.data?.user?.id === a.user.id, 'Authenticated /auth/me');
  log(meA.data?.user?.organizationId === a.organization.id, 'Authenticated /auth/me tenant matches selected organization');

  const orgsA = await request('/organizations/mine', { cookies: a.cookies, expected: 200 });
  log(orgsA.data?.data?.some((item) => item.organization?.id === a.organization.id), 'Organization membership lookup');

  const refreshA = await request('/auth/refresh', { method: 'POST', cookies: a.cookies, orgId: a.organization.id, expected: 201 });
  const rotatedCookies = cookieNames(refreshA.setCookies);
  log(rotatedCookies.length >= 2, 'Refresh token rotation');
  const replay = await request('/auth/refresh', { method: 'POST', cookies: a.cookies, orgId: a.organization.id });
  log(replay.response.status === 401, 'Refresh token replay rejected');
  a.cookies = rotatedCookies.length >= 2 ? rotatedCookies : a.cookies;

  const optionsA = await request('/discovery/options', { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
  log(Boolean(optionsA.data?.data?.fields && optionsA.data?.data?.operators), 'Discovery options');

  const overviewA = await request('/discovery/overview', { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
  log(Boolean(overviewA.data?.data?.totals), 'Discovery overview tenant scope');

  const leadsA = await request('/leads', { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
  log(Array.isArray(leadsA.data?.data) || Array.isArray(leadsA.data), 'Lead list');

  const subA = await request('/billing/subscription', { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
  log(Boolean(subA.data?.data?.subscription && subA.data?.data?.plan), 'Billing subscription provisioning');

  const invalidCrawl = await request('/crawl-jobs', {
    method: 'POST', cookies: a.cookies, orgId: a.organization.id, body: { urls: [] }, expected: 400,
  });
  log(invalidCrawl.response.status === 400, 'Invalid crawl input rejected');

  const b = await register(userB);
  log(Boolean(b.user?.id && b.organization?.id), 'Register account B', b.user?.email);

  const crossTenant = await request(`/organizations/${a.organization.id}`, {
    cookies: b.cookies, orgId: a.organization.id, expected: 403,
  });
  log(crossTenant.response.status === 403, 'Cross-tenant organization access blocked');

  const crossTenantLeads = await request('/leads', {
    cookies: b.cookies, orgId: a.organization.id, expected: 403,
  });
  log(crossTenantLeads.response.status === 403, 'Cross-tenant lead access blocked');

  if (RUN_CRAWL) {
    const crawl = await request('/crawl-jobs', {
      method: 'POST',
      cookies: a.cookies,
      orgId: a.organization.id,
      body: { urls: ['https://example.com'], maxPagesPerSite: 1, priority: 1 },
      expected: 201,
    });
    const jobId = crawl.data?.id || crawl.data?.data?.id;
    log(Boolean(jobId), 'Crawl job accepted by API', jobId || 'missing job id');

    if (jobId) {
      const started = Date.now();
      let finalJob = null;
      while (Date.now() - started < crawlTimeoutMs) {
        const current = await request(`/crawl-jobs/${jobId}`, { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
        finalJob = current.data?.data || current.data;
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(finalJob?.status)) break;
        await new Promise((resolve) => setTimeout(resolve, crawlPollMs));
      }
      log(['COMPLETED', 'FAILED', 'CANCELLED'].includes(finalJob?.status), 'Worker processed crawl job', `status=${finalJob?.status || 'TIMEOUT'}`);
      if (finalJob?.status === 'COMPLETED') {
        const results = await request(`/crawl-jobs/${jobId}/results`, { cookies: a.cookies, orgId: a.organization.id, expected: 200 });
        log(results.data !== null, 'Crawl results endpoint');
      }
    }
  }

  const logout = await request('/auth/logout', { method: 'POST', cookies: a.cookies, expected: 201 });
  log(logout.data?.ok === true, 'Logout');

  const afterLogout = await request('/auth/me', { cookies: a.cookies });
  log(afterLogout.response.status === 401, 'Access cookie rejected after logout');

  console.log('');
  console.log(`RESULT  passed=${passed} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FATAL  ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
