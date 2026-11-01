/**
 * Lead Aggregator API client (LA6 — Brand Self-Service Portal).
 * Wraps all /api/lead-aggregator/* endpoints.
 */
import { request } from '@/src/models/services/api';

const P = '/lead-aggregator';

export const leadAggregatorApi = {
  // Dashboard
  stats: () => request<any>(`${P}/stats`),

  // Brands
  registerBrand: (payload: any) => request<any>(`${P}/brands`, { method: 'POST', body: payload }),
  listBrands: (params?: { domain?: string; status?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.status) qs.set('status', params.status);
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return request<any>(`${P}/brands?${qs}`);
  },
  getBrand: (id: string) => request<any>(`${P}/brands/${id}`),
  updateBrand: (id: string, payload: any) => request<any>(`${P}/brands/${id}`, { method: 'PATCH', body: payload }),

  // Offers
  createOffer: (payload: any) => request<any>(`${P}/offers`, { method: 'POST', body: payload }),
  listOffers: (params?: { brand_id?: string; domain?: string; active_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.brand_id) qs.set('brand_id', params.brand_id);
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.active_only !== undefined) qs.set('active_only', String(params.active_only));
    return request<any>(`${P}/offers?${qs}`);
  },
  updateOffer: (id: string, payload: any) => request<any>(`${P}/offers/${id}`, { method: 'PATCH', body: payload }),

  // Leads
  submitLead: (payload: any) => request<any>(`${P}/leads`, { method: 'POST', body: payload }),
  listLeads: (params?: { brand_id?: string; domain?: string; status?: string; temperature?: string; min_score?: number; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.brand_id) qs.set('brand_id', params.brand_id);
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.status) qs.set('status', params.status);
    if (params?.temperature) qs.set('temperature', params.temperature);
    if (params?.min_score !== undefined) qs.set('min_score', String(params.min_score));
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return request<any>(`${P}/leads?${qs}`);
  },
  getLead: (id: string) => request<any>(`${P}/leads/${id}`),
  updateLeadStatus: (id: string, status: string) =>
    request<any>(`${P}/leads/${id}/status`, { method: 'PATCH', body: { status } }),
  getLeadsForBrand: (brandId: string, params?: { status?: string; min_score?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.min_score !== undefined) qs.set('min_score', String(params.min_score));
    return request<any>(`${P}/leads/brand/${brandId}?${qs}`);
  },
  exportLeads: (params?: { brand_id?: string; domain?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.brand_id) qs.set('brand_id', params.brand_id);
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return request<any>(`${P}/export/leads?${qs}`);
  },

  // OTP
  sendOtp: (phone: string, purpose?: string, email?: string) =>
    request<any>(`${P}/otp/send`, { method: 'POST', body: { phone, purpose, email } }),
  verifyOtp: (phone: string, otp: string) =>
    request<any>(`${P}/otp/verify`, { method: 'POST', body: { phone, otp } }),

  // Claims
  claimOffer: (offerId: string, leadId: string) =>
    request<any>(`${P}/offers/${offerId}/claim`, { method: 'POST', body: { lead_id: leadId } }),

  // Consent
  listConsent: (params?: { phone?: string; lead_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.phone) qs.set('phone', params.phone);
    if (params?.lead_id) qs.set('lead_id', params.lead_id);
    return request<any>(`${P}/consent?${qs}`);
  },
  revokeConsent: (phone: string) =>
    request<any>(`${P}/consent/revoke`, { method: 'POST', body: { phone } }),

  // Webhooks (LA3)
  webhookHealth: (brandId: string) => request<any>(`${P}/webhooks/health/${brandId}`),
  retryWebhooks: () => request<any>(`${P}/webhooks/retry`, { method: 'POST' }),
  deadLetterQueue: (brandId?: string) => {
    const qs = brandId ? `?brand_id=${brandId}` : '';
    return request<any>(`${P}/webhooks/dead-letter${qs}`);
  },

  // AI Matching (LA4)
  aiMatch: (leadId: string, brandId: string) =>
    request<any>(`${P}/ai/match`, { method: 'POST', body: { lead_id: leadId, brand_id: brandId } }),
  aiCost: (brandId?: string, month?: string) => {
    const qs = new URLSearchParams();
    if (brandId) qs.set('brand_id', brandId);
    if (month) qs.set('month', month);
    return request<any>(`${P}/ai/cost?${qs}`);
  },

  // Notifications (LA5)
  notificationInbox: (brandId: string, unreadOnly?: boolean) => {
    const qs = unreadOnly ? '?unread_only=true' : '';
    return request<any>(`${P}/notifications/inbox/${brandId}${qs}`);
  },
  markNotifRead: (brandId: string, notifIds: string[]) =>
    request<any>(`${P}/notifications/read/${brandId}`, { method: 'POST', body: { notif_ids: notifIds } }),
  setNotifPreferences: (brandId: string, mode: string) =>
    request<any>(`${P}/notifications/preferences/${brandId}`, { method: 'PUT', body: { mode } }),
  registerPushToken: (brandId: string, token: string, deviceId: string) =>
    request<any>(`${P}/notifications/push-token`, { method: 'POST', body: { brand_id: brandId, token, device_id: deviceId } }),

  // Dedup (LA7)
  checkDuplicates: (leadId: string) =>
    request<any>(`${P}/dedup/check`, { method: 'POST', body: { lead_id: leadId } }),
  mergeLeads: (primaryId: string, duplicateId: string) =>
    request<any>(`${P}/dedup/merge`, { method: 'POST', body: { primary_id: primaryId, duplicate_id: duplicateId } }),
  dedupScan: () => request<any>(`${P}/dedup/scan`),

  // Geo (LA8)
  geoDensity: (limit?: number) => request<any>(`${P}/geo/density${limit ? `?limit=${limit}` : ''}`),
  geoRegions: () => request<any>(`${P}/geo/regions`),
  resolveCity: (city: string) => request<any>(`${P}/geo/resolve/${encodeURIComponent(city)}`),

  // A/B Testing (LA9)
  createExperiment: (payload: any) => request<any>(`${P}/ab/experiments`, { method: 'POST', body: payload }),
  assignVariant: (experimentId: string, leadId: string) =>
    request<any>(`${P}/ab/assign`, { method: 'POST', body: { experiment_id: experimentId, lead_id: leadId } }),
  recordConversion: (experimentId: string, leadId: string) =>
    request<any>(`${P}/ab/convert`, { method: 'POST', body: { experiment_id: experimentId, lead_id: leadId } }),
  experimentResults: (experimentId: string) => request<any>(`${P}/ab/results/${experimentId}`),
  stopExperiment: (experimentId: string, winner?: string) =>
    request<any>(`${P}/ab/stop/${experimentId}`, { method: 'POST', body: { winner } }),

  // Attribution (LA10)
  leadJourney: (leadId: string) => request<any>(`${P}/attribution/journey/${leadId}`),
  attributeConversion: (leadId: string, model?: string) =>
    request<any>(`${P}/attribution/convert/${leadId}`, { method: 'POST', body: { model } }),
  channelPerformance: (brandId?: string, days?: number) => {
    const qs = new URLSearchParams();
    if (brandId) qs.set('brand_id', brandId);
    if (days) qs.set('days', String(days));
    return request<any>(`${P}/attribution/channels?${qs}`);
  },
  campaignRoi: (brandId: string, days?: number) =>
    request<any>(`${P}/attribution/campaigns/${brandId}${days ? `?days=${days}` : ''}`),

  // Fraud (LA11)
  leadRisk: (leadId: string) => request<any>(`${P}/fraud/risk/${leadId}`),
  fraudSummary: (days?: number) => request<any>(`${P}/fraud/summary${days ? `?days=${days}` : ''}`),

  // Pricing (LA12)
  priceQuote: (payload: any) => request<any>(`${P}/pricing/quote`, { method: 'POST', body: payload }),
  revenue: (brandId?: string, days?: number) => {
    const qs = new URLSearchParams();
    if (brandId) qs.set('brand_id', brandId);
    if (days) qs.set('days', String(days));
    return request<any>(`${P}/pricing/revenue?${qs}`);
  },
  pricingBreakdown: (days?: number) => request<any>(`${P}/pricing/breakdown${days ? `?days=${days}` : ''}`),

  // Campus Growth (LA13)
  campusStats: (institution: string) => request<any>(`${P}/campus/stats/${encodeURIComponent(institution)}`),
  campusRanking: (limit?: number) => request<any>(`${P}/campus/ranking${limit ? `?limit=${limit}` : ''}`),
  ambassadorLeaderboard: (limit?: number) => request<any>(`${P}/campus/leaderboard${limit ? `?limit=${limit}` : ''}`),
  growthTracker: () => request<any>(`${P}/campus/growth-tracker`),

  // Analytics (LA14)
  offerPerformance: (offerId: string) => request<any>(`${P}/analytics/offer/${offerId}`),
  brandAnalytics: (brandId: string, days?: number) =>
    request<any>(`${P}/analytics/brand/${brandId}${days ? `?days=${days}` : ''}`),
  compareOffers: (offerIds: string[]) =>
    request<any>(`${P}/analytics/compare`, { method: 'POST', body: { offer_ids: offerIds } }),
  dailySnapshot: (brandId?: string) =>
    request<any>(`${P}/analytics/daily${brandId ? `?brand_id=${brandId}` : ''}`),

  // Bot
  triggerBot: () => request<any>(`${P}/bot/run`, { method: 'POST' }),
  botStatus: () => request<any>(`${P}/bot/status`),

  // Domains
  domains: () => request<any>(`${P}/domains`),

  // Campus contacts
  addCampusContact: (payload: any) => request<any>(`${P}/campus/contacts`, { method: 'POST', body: payload }),
  listCampusContacts: (params?: { role?: string; institution?: string }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.institution) qs.set('institution', params.institution);
    return request<any>(`${P}/campus/contacts?${qs}`);
  },
  verifyCampusContact: (contactId: string) =>
    request<any>(`${P}/campus/contacts/${contactId}/verify`, { method: 'PATCH' }),

  // Serial claimers
  serialClaimers: (days?: number) => request<any>(`${P}/serial-claimers${days ? `?days=${days}` : ''}`),

  // Enhancement #1 — Rate Limits
  rateLimits: (brandId: string) => request<any>(`${P}/rate-limits/${brandId}`),
  setRateLimit: (brandId: string, endpoint: string, maxRequests: number) =>
    request<any>(`${P}/rate-limits/set`, { method: 'POST', body: { brand_id: brandId, endpoint, max_requests: maxRequests } }),

  // Enhancement #2 — Auth
  adminLogin: (email: string, password: string) =>
    request<any>(`${P}/auth/login`, { method: 'POST', body: { email, password } }),
  brandLogin: (apiKey: string) =>
    request<any>(`${P}/auth/brand-login`, { method: 'POST', body: { api_key: apiKey } }),

  // Enhancement #3 — CSV/Excel Export
  exportLeadsCsv: (params?: { brand_id?: string; domain?: string }) => {
    const qs = new URLSearchParams();
    if (params?.brand_id) qs.set('brand_id', params.brand_id);
    if (params?.domain) qs.set('domain', params.domain);
    return request<any>(`${P}/export/leads/csv?${qs}`);
  },
  exportLeadsExcel: (params?: { brand_id?: string; domain?: string }) => {
    const qs = new URLSearchParams();
    if (params?.brand_id) qs.set('brand_id', params.brand_id);
    if (params?.domain) qs.set('domain', params.domain);
    return request<any>(`${P}/export/leads/excel?${qs}`);
  },
  exportBrandsCsv: () => request<any>(`${P}/export/brands/csv`),
  exportClaimsCsv: (brandId?: string) =>
    request<any>(`${P}/export/claims/csv${brandId ? `?brand_id=${brandId}` : ''}`),

  // Enhancement #5 — WhatsApp Bot
  waSessionCount: () => request<any>(`${P}/wa/sessions`),

  // Enhancement #6 — Email Digests
  sendDigest: (brandId: string, period?: string) =>
    request<any>(`${P}/digests/send/${brandId}`, { method: 'POST', body: { period: period || 'weekly' } }),
  sendAllDigests: (period?: string) =>
    request<any>(`${P}/digests/send-all`, { method: 'POST', body: { period: period || 'weekly' } }),
  scheduleDigest: (brandId: string, frequency: string, dayOfWeek?: number) =>
    request<any>(`${P}/digests/schedule/${brandId}`, { method: 'POST', body: { frequency, day_of_week: dayOfWeek || 0 } }),

  // Enhancement #7 — Bulk Import
  bulkImport: (brandId: string, csvBase64: string) =>
    request<any>(`${P}/import/leads`, { method: 'POST', body: { brand_id: brandId, csv_data: csvBase64 } }),
  importStatus: (importId: string) => request<any>(`${P}/import/status/${importId}`),
  importHistory: (brandId: string) => request<any>(`${P}/import/history/${brandId}`),

  // Enhancement #8 — Assignment Rules
  createAssignmentRule: (payload: any) =>
    request<any>(`${P}/assignments/rules`, { method: 'POST', body: payload }),
  listAssignmentRules: (brandId: string) => request<any>(`${P}/assignments/rules/${brandId}`),
  leadAssignments: (leadId: string) => request<any>(`${P}/assignments/lead/${leadId}`),
  reassignLead: (leadId: string, brandId: string, repEmail: string) =>
    request<any>(`${P}/assignments/reassign`, { method: 'POST', body: { lead_id: leadId, brand_id: brandId, rep_email: repEmail } }),
  repWorkload: (brandId: string) => request<any>(`${P}/assignments/workload/${brandId}`),

  // Enhancement #10 — Multi-language Consent
  consentLanguages: () => request<any>(`${P}/consent/languages`),
  consentForm: (lang: string) => request<any>(`${P}/consent/form/${lang}`),
  consentFormHtml: (lang: string, brandName?: string) =>
    request<any>(`${P}/consent/form/${lang}/html${brandName ? `?brand_name=${brandName}` : ''}`),
  recordConsentI18n: (payload: any) =>
    request<any>(`${P}/consent/record`, { method: 'POST', body: payload }),

  // Enhancement #11 — ML Scoring V2
  mlRetrain: (minSamples?: number) =>
    request<any>(`${P}/ml/retrain`, { method: 'POST', body: { min_samples: minSamples || 100 } }),
  mlModelInfo: () => request<any>(`${P}/ml/model-info`),
  mlScore: (leadId: string, brandId: string) =>
    request<any>(`${P}/ml/score`, { method: 'POST', body: { lead_id: leadId, brand_id: brandId } }),

  // Enhancement #12 — Integrations
  integrationTemplates: () => request<any>(`${P}/integrations/templates`),
  integrationTemplate: (templateId: string) => request<any>(`${P}/integrations/templates/${templateId}`),
  setupIntegration: (brandId: string, templateId: string, config: any) =>
    request<any>(`${P}/integrations/setup`, { method: 'POST', body: { brand_id: brandId, template_id: templateId, config } }),
  testIntegration: (brandId: string, integrationId: string) =>
    request<any>(`${P}/integrations/test/${integrationId}`, { method: 'POST', body: { brand_id: brandId } }),
  brandIntegrations: (brandId: string) => request<any>(`${P}/integrations/brand/${brandId}`),
  integrationLogs: (brandId: string, limit?: number) =>
    request<any>(`${P}/integrations/logs/${brandId}${limit ? `?limit=${limit}` : ''}`),
  toggleIntegration: (integrationId: string) =>
    request<any>(`${P}/integrations/toggle/${integrationId}`, { method: 'POST' }),
  deleteIntegration: (integrationId: string) =>
    request<any>(`${P}/integrations/${integrationId}`, { method: 'DELETE' }),
};
