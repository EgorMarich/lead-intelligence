import { getSession } from './auth';
import axios from 'axios';
import type {
  OrganizationMembership,
  RawLead,
  SearchJob,
  User,
  QualifiedBusiness,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthInterceptors() {
  api.interceptors.request.use((config) => {
    if (typeof window === 'undefined') return config;

    const accessToken = localStorage.getItem('lead_access_token');
    const organizationId = localStorage.getItem('lead_organization_id');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (organizationId) {
      config.headers['x-organization-id'] = organizationId;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('lead_access_token');
        localStorage.removeItem('lead_refresh_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{
    user: User;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  }>('/auth/login', { email, password });
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}) {
  const { data } = await api.post<{
    user: User;
    organization: OrganizationMembership['organization'];
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  }>('/auth/register', payload);
  return data;
}

export async function getOrganizations() {
  const { data } = await api.get<{ data: OrganizationMembership[] }>(
    '/organizations/mine',
  );
  return data.data;
}

export async function getSearchJobs() {
  const { data } = await api.get<{ data: SearchJob[] }>('/search-jobs');
  return data.data;
}

export async function createSearch(payload: {
  source: string;
  query?: string;
  cityId?: string;
  categoryId?: string;
  filters?: Record<string, unknown>;
  limit: number;
}) {
  const { data } = await api.post<{ data: SearchJob }>('/search-jobs', payload);
  return data.data;
}

export async function getSearchJob(id: string) {
  const { data } = await api.get<{ data: SearchJob }>(`/search-jobs/${id}`);
  return data.data;
}

export async function getSearchLeads(id: string) {
  const { data } = await api.get<{ data: RawLead[] }>(
    `/search-jobs/${id}/leads`,
  );
  return data.data;
}

export async function cancelSearch(id: string) {
  const { data } = await api.post(`/scraping/jobs/${id}/cancel`);
  return data.data;
}

export type DiscoveryOptions = {
  cities: { id: string; name: string; region?: string }[];
  categories: { id: string; code: string; name: string; parentCategoryId?: string }[];
  fields: { value: string; label: string; operators: string[]; valueType: 'text' | 'number' | 'boolean' | 'select' }[];
  operators: Record<string, string>;
  grades: string[];
};

export async function getDiscoveryOptions() {
  const { data } = await api.get<{ data: DiscoveryOptions }>('/discovery/options');
  return data.data;
}

export async function getSources() {
  const { data } = await api.get<{ data: string[] }>('/scraping/sources');
  return data.data;
}

export async function getQualifiedLeads(params?: { city?: string; minScore?: number; grade?: string; limit?: number; offset?: number }) {
  const { data } = await api.get<{ data: QualifiedBusiness[]; meta: { count: number; limit: number; offset: number } }>('/lead-intelligence', { params });
  return data;
}

export async function getQualifiedLead(id: string) {
  const { data } = await api.get<{ data: QualifiedBusiness & { features: unknown[]; contacts: unknown[] } }>(`/lead-intelligence/${id}`);
  return data.data;
}

export type WebsiteAnalysis = {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  status: 'COMPLETED' | 'FAILED';
  pages: number;
  httpStatus?: number;
  title?: string;
  description?: string;
  language?: string;
  ssl: boolean;
  technologies: string[];
  contacts: { emails: string[]; phones: string[]; social: Record<string, string[]> };
  signals: { onlineBooking: boolean; contactPage: boolean; analytics: boolean; ecommerce: boolean };
  links: string[];
  error?: string;
};

export async function analyzeWebsite(url: string, maxPages = 3) {
  const { data } = await api.post<WebsiteAnalysis>('/website-intelligence/analyze', { url, maxPages });
  return data;
}



export type EnrichmentJob = {
  id: string;
  organizationId: string;
  businessId: string;
  status: 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';
  attempts: number;
  error?: string;
  result: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

export async function enqueueEnrichment(businessId: string) {
  const { data } = await api.post<{ data: EnrichmentJob }>(`/enrichment/${businessId}`);
  return data.data;
}

export async function getEnrichment(businessId: string) {
  const { data } = await api.get<{ data: { business: { enrichmentStatus: string; enrichedAt?: string; enrichmentError?: string; enrichmentVersion: number }; job: EnrichmentJob | null } }>(`/enrichment/${businessId}`);
  return data.data;
}

export type LeadWorkspace = QualifiedBusiness & {
  lead: {
    id: string;
    status: 'NEW'|'CONTACTED'|'INTERESTED'|'NEGOTIATION'|'CONVERTED'|'LOST';
    score: number;
    grade?: string;
    scoreReasons: unknown[];
    assigneeId?: string;
    tags: string[];
    notes: Array<{ id: string; text: string; actorId?: string; createdAt: string }>;
    activities: Array<{ id: string; type: string; actorId?: string; metadata?: Record<string, unknown>; createdAt: string }>;
  } | null;
  features: Array<{ id: string; feature: string; value: boolean; confidence: number; source: string; detectedAt: string }>;
  contacts: Array<{ id: string; type: string; value: string; isPrimary: boolean }>;
};

export async function getLeadWorkspace(id: string) {
  const { data } = await api.get<{ data: LeadWorkspace }>(`/lead-intelligence/${id}`);
  return data.data;
}

export async function updateLeadCrm(id: string, payload: { status?: LeadWorkspace['lead'] extends infer T ? T extends {status: infer S} ? S : never : never; assigneeId?: string | null; tags?: string[]; dealValue?: number; revenue?: number }) {
  const { data } = await api.put<{ data: NonNullable<LeadWorkspace['lead']> }>(`/lead-intelligence/${id}/crm`, payload);
  return data.data;
}

export async function addLeadNote(id: string, text: string) {
  const { data } = await api.post<{ data: NonNullable<LeadWorkspace['lead']> }>(`/lead-intelligence/${id}/crm/notes`, { text });
  return data.data;
}

export type OutreachChannel = 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'|'INSTAGRAM'|'PHONE';
export type OutreachMessage = { id:string; organizationId:string; businessId:string; leadId:string; channel:OutreachChannel; contactId?:string; recipient:string; subject?:string; body:string; status:'DRAFT'|'QUEUED'|'SENDING'|'SENT'|'FAILED'|'CANCELLED'; attempts:number; error?:string; metadata:Record<string,unknown>; createdAt:string; sentAt?:string };
export type OutreachPreview = { businessId:string; leadId:string; channel:OutreachChannel; recipient:string; subject?:string; body:string };
export async function getOutreachMessages(businessId?: string) { const { data } = await api.get<{data:OutreachMessage[]}>('/outreach/messages' + (businessId ? `/${businessId}` : '')); return data.data; }
export async function getOutreachPreview(businessId:string, channel:OutreachChannel) { const { data } = await api.get<{data:OutreachPreview}>(`/outreach/preview/${businessId}/${channel}`); return data.data; }
export async function createOutreachMessage(businessId:string, payload:{channel:OutreachChannel;contactId?:string;subject?:string;body:string}) { const {data}=await api.post<{data:OutreachMessage}>(`/outreach/messages/${businessId}`,payload); return data.data; }
export async function sendOutreachMessage(id:string) { const {data}=await api.post<{data:OutreachMessage}>(`/outreach/messages/${id}/send`); return data.data; }

export type AnalyticsOverview = {
  period: { from: string; to: string };
  discovery: { jobs: number; found: number; processed: number; errors: number; processingRate: number };
  enrichment: { total: number; completed: number; failed: number; successRate: number };
  funnel: {
    businesses: number; qualified: number; contacted: number; interested: number;
    negotiation: number; converted: number; lost: number;
    rates: Record<string, number>; byStatus: Record<string, number>;
  };
  outreach: { total: number; sent: number; failed: number; sendRate: number; byChannel: Array<{channel:string;total:number;sent:number}> };
  financial: { pipelineValue: number; convertedRevenue: number; currency: string; note?: string };
};

export async function getAnalyticsOverview(params?: { from?: string; to?: string }) {
  const { data } = await api.get<{ data: AnalyticsOverview }>('/analytics/overview', { params });
  return data.data;
}

export async function getAnalyticsBreakdown(dimension: 'channel'|'city'|'category'|'source', params?: { from?: string; to?: string }) {
  const { data } = await api.get<{ data: Array<Record<string, unknown>> }>('/analytics/breakdown', { params: { dimension, ...params } });
  return data.data;
}

export type AiInsight = {
  id: string;
  businessId: string;
  provider: string;
  model: string;
  generatedAt: string;
  updatedAt: string;
  payload: {
    summary: string;
    icpFit: number;
    painPoints: Array<{ title: string; evidence: string; impact: 'LOW'|'MEDIUM'|'HIGH' }>;
    pitch: string;
    recommendedChannels: Array<{ channel: string; reason: string; priority: number }>;
    objections: Array<{ objection: string; response: string }>;
    nextBestAction: { action: string; reason: string };
    outreachVariants: Array<{ channel: string; subject?: string; body: string }>;
    confidence: number;
  };
};

export async function getAiInsight(businessId: string) {
  const { data } = await api.get<{ data: AiInsight | null }>(`/ai-intelligence/${businessId}`);
  return data.data;
}
export async function generateAiInsight(businessId: string) {
  const { data } = await api.post<{ data: AiInsight }>(`/ai-intelligence/${businessId}/analyze`);
  return data.data;
}


export type CommunicationMessage = { id:string; channel:'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'; direction:'INBOUND'|'OUTBOUND'; sender:string; recipient:string; body:string; subject?:string; status:string; createdAt:string };
export async function getCommunicationMessages(businessId:string){ const {data}=await api.get(`/communications/messages/${businessId}`); return data.data as CommunicationMessage[]; }

export type AiReplySuggestion = { id:string; businessId:string; leadId:string; messageId:string; channel:'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'; suggestion:string; subject?:string; analysis:{intent:string;sentiment:string;recommendedAction:string;provider:string}; status:'SUGGESTED'|'USED'|'DISMISSED'; createdAt:string };
export async function getReplySuggestion(businessId:string){ const {data}=await api.get<{data:AiReplySuggestion|null}>(`/communications/copilot/${businessId}`); return data.data; }
export async function generateReplySuggestion(businessId:string){ const {data}=await api.post<{data:AiReplySuggestion}>(`/communications/copilot/${businessId}/suggest`); return data.data; }
export async function useReplySuggestion(id:string, body?:string){ const {data}=await api.post(`/communications/copilot/${id}/use`, body ? {body} : {}); return data.data; }
export async function dismissReplySuggestion(id:string){ const {data}=await api.post(`/communications/copilot/${id}/dismiss`); return data.data; }

export type SalesSequence = { id:string; name:string; description?:string; status:'DRAFT'|'ACTIVE'|'PAUSED'|'ARCHIVED'; steps:Array<{delayMinutes:number;channel:'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';subject?:string;body:string}>; stopOnReply:boolean; stopOnStatuses:string[]; automationMode:'STATIC'|'AI_ADAPTIVE'; aiEnabled:boolean; aiAllowedChannels:Array<'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'>; aiMinConfidence:number; aiDefaultDelayMinutes:number; aiMaxDelayMinutes:number };
export type AiSalesDecision = { id?:string; channel:'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'; subject?:string; body:string; nextDelayMinutes:number; recommendedAction:string; reason:string; confidence:number; stopSequence:boolean };
export type SequenceEnrollment = { id:string; sequenceId:string; businessId:string; leadId:string; status:'ACTIVE'|'PAUSED'|'COMPLETED'|'STOPPED'|'FAILED'; currentStep:number; nextRunAt?:string; stopReason?:string };
export async function getSequences(){return (await api.get<{data:SalesSequence[]}>('/sequences')).data.data}
export async function createSequence(input:Partial<SalesSequence>){return (await api.post<{data:SalesSequence}>('/sequences',input)).data.data}
export async function updateSequence(id:string,input:Partial<SalesSequence>){return (await api.put<{data:SalesSequence}>(`/sequences/${id}`,input)).data.data}
export async function activateSequence(id:string){return (await api.post<{data:SalesSequence}>(`/sequences/${id}/activate`)).data.data}
export async function previewAiSequence(id:string,businessId:string){return (await api.post<{data:AiSalesDecision}>(`/sequences/${id}/ai-preview/${businessId}`)).data.data}
export async function enrollSequence(id:string,businessIds:string[]){return (await api.post(`/sequences/${id}/enroll`,{businessIds})).data}
export async function getSequenceEnrollments(){return (await api.get<{data:SequenceEnrollment[]}>('/sequences/enrollments')).data.data}

export type CommandCenterAction = { type:string; priority:number; businessId:string; leadId:string; title:string; description:string; action:string; messageId?:string; decisionId?:string; enrollmentId?:string };
export type CommandCenterOverview = {
  generatedAt:string;
  kpis:{hotLeads:number;activeSequences:number;activeEnrollments:number;repliesToday:number;pendingAiDecisions:number;pipelineValue:number};
  funnel:Record<string,number>;
  sequences:Record<string,number>;
  actions:CommandCenterAction[];
  hotLeads:Array<{id:string;businessId:string;status:string;score:number;grade?:string;dealValue:number;business?:{id:string;name:string;city?:string}|null}>;
  activeEnrollments:Array<{id:string;businessId:string;leadId:string;sequenceId:string;status:string;currentStep:number;nextRunAt?:string;sequenceName:string}>;
  recentReplies:Array<{id:string;businessId:string;leadId:string;channel:string;body:string;createdAt:string}>;
};
export async function getCommandCenterOverview(){return (await api.get<{data:CommandCenterOverview}>('/command-center/overview')).data.data}

export type AiSalesManagerPriority = { priority:string; title:string; reason:string; action:string };
export type AiSalesManagerBriefing = { headline:string; summary:string; priorities:AiSalesManagerPriority[]; opportunities:string[]; risks:string[]; managerAdvice:string; confidence:number };
export type AiSalesManagerResponse = { generatedAt:string; provider:string; metrics:{leads:number;newOrUpdated30d:number;hotLeads:number;unansweredReplies:number;staleLeads:number;activeEnrollments:number;activeSequences:number;pendingAiDecisions:number;channelStats:Array<{channel:string;sent:number;successful:number}>}; briefing:AiSalesManagerBriefing; hotLeads:Array<{businessId:string;name:string;status:string;score:number;dealValue:number}>; unansweredReplies:Array<{businessId:string;name:string;channel:string;body:string;createdAt:string}>; staleLeads:Array<{businessId:string;name:string;status:string;score:number;daysIdle:number}> };
export async function getAiSalesManagerBriefing(){return (await api.get<{data:AiSalesManagerResponse}>('/ai-sales-manager/briefing')).data.data}

export type AiSalesManagerPriority = { priority:string; title:string; reason:string; action:string };
export type AiSalesManagerBriefing = { headline:string; summary:string; priorities:AiSalesManagerPriority[]; opportunities:string[]; risks:string[]; managerAdvice:string; confidence:number };
export type AiSalesManagerResponse = { generatedAt:string; provider:string; metrics:{leads:number;newOrUpdated30d:number;hotLeads:number;unansweredReplies:number;staleLeads:number;activeEnrollments:number;activeSequences:number;pendingAiDecisions:number;channelStats:Array<{channel:string;sent:number;successful:number}>}; briefing:AiSalesManagerBriefing; hotLeads:Array<{businessId:string;name:string;status:string;score:number;dealValue:number}>; unansweredReplies:Array<{businessId:string;name:string;channel:string;body:string;createdAt:string}>; staleLeads:Array<{businessId:string;name:string;status:string;score:number;daysIdle:number}> };
export async function getAiSalesManagerBriefing(){return (await api.get<{data:AiSalesManagerResponse}>('/ai-sales-manager/briefing')).data.data}

export type RevenueOverview = {
  period:{from:string;to:string}; currency:string;
  subscription:{planCode:string;status:string;active:boolean;mrr:number;arr:number;arpu:number;churned:boolean;canceledAt?:string|null};
  metrics:{mrr:number;arr:number;arpu:number;churnRate:number;leadToCustomerConversion:number;customers:number;paidOutreach:number;ltv:number;cac:number|null;paybackMonths:number|null};
  revenue:{periodRevenue:number;successfulPayments:number;totalPayments:number};
  monthly:Array<{month:string;revenue:number;mrr:number}>;
  unitEconomics:{aiCostPerCustomerRub:number;paymentReserveRate:number;marketingReserveRate:number;targetContributionMargin:number;cacNote:string};
};
export async function getRevenueOverview(months=12){const {data}=await api.get<{data:RevenueOverview}>('/revenue/overview',{params:{months}});return data.data;}
export async function updateOrganization(id:string, payload:{name?:string;countryCode?:string;languageCode?:string;currencyCode?:string;timezone?:string}){const {data}=await api.patch(`/organizations/${id}`,payload);return data.data;}

export type RevenueOverview = { period:{from:string;to:string}; currency:string; subscription:{planCode:string;status:string;active:boolean;mrr:number;arr:number;arpu:number;churned:boolean;canceledAt?:string|null}; metrics:{mrr:number;arr:number;arpu:number;churnRate:number;leadToCustomerConversion:number;customers:number;paidOutreach:number;ltv:number;cac:number|null;paybackMonths:number|null}; revenue:{periodRevenue:number;successfulPayments:number;totalPayments:number}; monthly:Array<{month:string;revenue:number;mrr:number}>; unitEconomics:{aiCostPerCustomerRub:number;paymentReserveRate:number;marketingReserveRate:number;targetContributionMargin:number;cacNote:string}; };
export async function getRevenueOverview(months=12){const {data}=await api.get<{data:RevenueOverview}>('/revenue/overview',{params:{months}});return data.data;}
export async function updateOrganization(id:string,payload:{name?:string;countryCode?:string;languageCode?:string;currencyCode?:string;timezone?:string}){const {data}=await api.patch(`/organizations/${id}`,payload);return data.data;}
