import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://127.0.0.1:8000';
const BASE = `${BACKEND_URL}/api/lead-aggregator`;

const TS = Date.now();

// Shared state across serial tests
let brandId: string;
let apiKey: string;
let offerId: string;
let leadId: string;
let assignmentRuleId: string;
let integrationId: string;

// ═══════════════════════════════════════════════════════════════════════════
// 1. Brand Lifecycle
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('1. Brand Lifecycle', () => {
  test('1.1 Register a brand', async ({ request }) => {
    const res = await request.post(`${BASE}/brands`, {
      data: {
        name: `TestBrand_${TS}`,
        domain: 'ed_tech',
        city: 'Mumbai',
        contact_email: `brand_${TS}@example.com`,
        contact_phone: '+919876543210',
        tier: 'starter',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand_id).toBeTruthy();
    expect(body.api_key).toBeTruthy();
    brandId = body.brand_id;
    apiKey = body.api_key;
  });

  test('1.2 List brands with pagination', async ({ request }) => {
    const res = await request.get(`${BASE}/brands?skip=0&limit=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('1.3 Get single brand by ID', async ({ request }) => {
    const res = await request.get(`${BASE}/brands/${brandId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand_id).toBe(brandId);
    expect(body.name).toContain('TestBrand_');
  });

  test('1.4 Update brand fields', async ({ request }) => {
    const res = await request.patch(`${BASE}/brands/${brandId}`, {
      data: { city: 'Delhi' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('1.5 Duplicate brand registration returns 409', async ({ request }) => {
    const res = await request.post(`${BASE}/brands`, {
      data: {
        name: `TestBrand_${TS}`,
        domain: 'ed_tech',
        city: 'Mumbai',
        contact_email: `brand_${TS}@example.com`,
        contact_phone: '+919876543210',
      },
    });
    expect(res.status()).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Offer Lifecycle
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('2. Offer Lifecycle', () => {
  test('2.1 Create offer for registered brand', async ({ request }) => {
    const res = await request.post(`${BASE}/offers`, {
      data: {
        brand_id: brandId,
        title: `TestOffer_${TS}`,
        domain: 'ed_tech',
        description: 'E2E test offer',
        city: 'Mumbai',
        max_claims: 100,
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.offer_id).toBeTruthy();
    offerId = body.offer_id;
  });

  test('2.2 List offers filtered by brand_id', async ({ request }) => {
    const res = await request.get(`${BASE}/offers?brand_id=${brandId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((o: any) => o.offer_id === offerId)).toBe(true);
  });

  test('2.3 Update offer (toggle active)', async ({ request }) => {
    const res = await request.patch(`${BASE}/offers/${offerId}`, {
      data: { is_active: false },
    });
    expect(res.status()).toBe(200);
    // Re-activate for later tests
    await request.patch(`${BASE}/offers/${offerId}`, {
      data: { is_active: true },
    });
  });

  test('2.4 Create offer for nonexistent brand returns 404', async ({ request }) => {
    const res = await request.post(`${BASE}/offers`, {
      data: {
        brand_id: 'NONEXISTENT_BRAND_999',
        title: 'Bad Offer',
        domain: 'ed_tech',
        description: 'Should fail',
        city: 'Mumbai',
      },
    });
    expect(res.status()).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Lead Pipeline
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('3. Lead Pipeline', () => {
  test('3.1 Submit lead with scoring', async ({ request }) => {
    const res = await request.post(`${BASE}/leads`, {
      data: {
        full_name: `Lead_${TS}`,
        email: `lead_${TS}@example.com`,
        phone: '+919876543211',
        domain: 'ed_tech',
        city: 'Mumbai',
        college: 'IIT Bombay',
        graduation_year: 2024,
        interests: ['machine_learning', 'data_science'],
        source_platform: 'website',
        consent_given: true,
        consent_purpose: 'marketing',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.lead_id).toBeTruthy();
    expect(typeof body.score).toBe('number');
    expect(body.temperature).toBeTruthy();
    leadId = body.lead_id;
  });

  test('3.2 List leads with filters', async ({ request }) => {
    const res = await request.get(`${BASE}/leads?domain=ed_tech&limit=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('3.3 Get single lead', async ({ request }) => {
    const res = await request.get(`${BASE}/leads/${leadId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.lead_id).toBe(leadId);
  });

  test('3.4 Update lead status chain', async ({ request }) => {
    for (const status of ['contacted', 'qualified', 'converted']) {
      const res = await request.patch(`${BASE}/leads/${leadId}/status`, {
        data: { status },
      });
      expect(res.status()).toBe(200);
    }
  });

  test('3.5 Invalid status update returns 400', async ({ request }) => {
    const res = await request.patch(`${BASE}/leads/${leadId}/status`, {
      data: { status: 'invalid_status_xyz' },
    });
    expect(res.status()).toBe(400);
  });

  test('3.6 Get leads for specific brand', async ({ request }) => {
    const res = await request.get(`${BASE}/leads/brand/${brandId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. OTP Flow
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('4. OTP Flow', () => {
  test('4.1 Send OTP', async ({ request }) => {
    const res = await request.post(`${BASE}/otp/send`, {
      data: {
        phone: '+919876543211',
        channel: 'sms',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('sent');
  });

  test('4.2 Verify with wrong OTP returns error', async ({ request }) => {
    const res = await request.post(`${BASE}/otp/verify`, {
      data: {
        phone: '+919876543211',
        otp: '000000',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(false);
  });

  test('4.3 Rapid OTP sends (rate limit check)', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.post(`${BASE}/otp/send`, {
        data: { phone: '+919999999999', channel: 'sms' },
      })
    );
    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status());
    expect(statuses.every(s => s === 200 || s === 429)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Claims
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('5. Claims', () => {
  test('5.1 Claim an offer', async ({ request }) => {
    const res = await request.post(`${BASE}/offers/${offerId}/claim`, {
      data: {
        lead_id: leadId,
        student_email: `lead_${TS}@example.com`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.claim_id).toBeTruthy();
  });

  test('5.2 Duplicate claim returns 409', async ({ request }) => {
    const res = await request.post(`${BASE}/offers/${offerId}/claim`, {
      data: {
        lead_id: leadId,
        student_email: `lead_${TS}@example.com`,
      },
    });
    expect(res.status()).toBe(409);
  });

  test('5.3 Claim inactive offer returns 400', async ({ request }) => {
    // Deactivate the offer first
    await request.patch(`${BASE}/offers/${offerId}`, {
      data: { is_active: false },
    });
    const res = await request.post(`${BASE}/offers/${offerId}/claim`, {
      data: {
        lead_id: leadId,
        student_email: `another_${TS}@example.com`,
      },
    });
    expect(res.status()).toBe(400);
    // Re-activate
    await request.patch(`${BASE}/offers/${offerId}`, {
      data: { is_active: true },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Export
// ═══════════════════════════════════════════════════════════════════════════
test.describe('6. Export', () => {
  test('6.1 Export leads as JSON', async ({ request }) => {
    const res = await request.get(`${BASE}/export/leads`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('6.2 Export leads CSV', async ({ request }) => {
    const res = await request.get(`${BASE}/export/leads/csv`);
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/csv');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Webhooks
// ═══════════════════════════════════════════════════════════════════════════
test.describe('7. Webhooks', () => {
  test('7.1 Webhook health for brand', async ({ request }) => {
    const res = await request.get(`${BASE}/webhooks/health/${brandId}`);
    expect(res.status()).toBe(200);
  });

  test('7.2 Dead letter queue', async ({ request }) => {
    const res = await request.get(`${BASE}/webhooks/dead-letter`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Dedup
// ═══════════════════════════════════════════════════════════════════════════
test.describe('8. Dedup', () => {
  test('8.1 Check duplicates for a lead', async ({ request }) => {
    const res = await request.post(`${BASE}/dedup/check`, {
      data: {
        email: `lead_${TS}@example.com`,
        phone: '+919876543211',
        full_name: `Lead_${TS}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('duplicates');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Geo
// ═══════════════════════════════════════════════════════════════════════════
test.describe('9. Geo', () => {
  test('9.1 Resolve city alias', async ({ request }) => {
    const res = await request.get(`${BASE}/geo/resolve/Bombay`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.canonical).toBe('mumbai');
  });

  test('9.2 Lead density', async ({ request }) => {
    const res = await request.get(`${BASE}/geo/density`);
    expect(res.status()).toBe(200);
  });

  test('9.3 Regional summary', async ({ request }) => {
    const res = await request.get(`${BASE}/geo/regions`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. A/B Testing
// ═══════════════════════════════════════════════════════════════════════════
let experimentId: string;

test.describe.serial('10. A/B Testing', () => {
  test('10.1 Create experiment', async ({ request }) => {
    const res = await request.post(`${BASE}/ab/experiments`, {
      data: {
        name: `Exp_${TS}`,
        variants: ['control', 'variant_a'],
        brand_id: brandId,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.experiment_id).toBeTruthy();
    experimentId = body.experiment_id;
  });

  test('10.2 Get experiment results', async ({ request }) => {
    const res = await request.get(`${BASE}/ab/results/${experimentId}`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Fraud
// ═══════════════════════════════════════════════════════════════════════════
test.describe('11. Fraud', () => {
  test('11.1 Get lead risk', async ({ request }) => {
    const res = await request.get(`${BASE}/fraud/risk/${leadId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('risk_score');
  });

  test('11.2 Fraud summary', async ({ request }) => {
    const res = await request.get(`${BASE}/fraud/summary`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Pricing
// ═══════════════════════════════════════════════════════════════════════════
test.describe('12. Pricing', () => {
  test('12.1 Get price quote', async ({ request }) => {
    const res = await request.post(`${BASE}/pricing/quote`, {
      data: {
        brand_id: brandId,
        lead_id: leadId,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.price).toBe('number');
  });

  test('12.2 Revenue summary', async ({ request }) => {
    const res = await request.get(`${BASE}/pricing/revenue`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Campus
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('13. Campus', () => {
  test('13.1 Add campus contact', async ({ request }) => {
    const res = await request.post(`${BASE}/campus/contacts`, {
      data: {
        name: `CampusRep_${TS}`,
        email: `campus_${TS}@college.edu`,
        phone: '+919876543212',
        institution: 'IIT Bombay',
        role: 'ambassador',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.contact_id).toBeTruthy();
    expect(body.referral_code).toBeTruthy();
  });

  test('13.2 List contacts', async ({ request }) => {
    const res = await request.get(`${BASE}/campus/contacts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('13.3 Campus ranking', async ({ request }) => {
    const res = await request.get(`${BASE}/campus/ranking`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Analytics
// ═══════════════════════════════════════════════════════════════════════════
test.describe('14. Analytics', () => {
  test('14.1 Daily snapshot', async ({ request }) => {
    const res = await request.get(`${BASE}/analytics/daily`);
    expect(res.status()).toBe(200);
  });

  test('14.2 Offer performance', async ({ request }) => {
    const res = await request.get(`${BASE}/analytics/offer/${offerId}`);
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. Auth
// ═══════════════════════════════════════════════════════════════════════════
test.describe('15. Auth', () => {
  test('15.1 Admin login with bad creds returns 401', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, {
      data: {
        email: 'nonexistent@admin.com',
        password: 'wrongpassword',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('15.2 Brand login with API key', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/brand-login`, {
      data: { api_key: apiKey },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand_id).toBe(brandId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. ML Scoring
// ═══════════════════════════════════════════════════════════════════════════
test.describe('16. ML Scoring', () => {
  test('16.1 Model info', async ({ request }) => {
    const res = await request.get(`${BASE}/ml/model-info`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('version');
  });

  test('16.2 ML score for lead + brand', async ({ request }) => {
    const res = await request.post(`${BASE}/ml/score`, {
      data: {
        lead_id: leadId,
        brand_id: brandId,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.ml_score).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. Integrations
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('17. Integrations', () => {
  test('17.1 List integration templates (8+)', async ({ request }) => {
    const res = await request.get(`${BASE}/integrations/templates`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(8);
  });

  test('17.2 Get specific template details', async ({ request }) => {
    const res = await request.get(`${BASE}/integrations/templates/zapier_new_lead`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.template_id).toBe('zapier_new_lead');
  });

  test('17.3 Setup integration for brand', async ({ request }) => {
    const res = await request.post(`${BASE}/integrations/setup`, {
      data: {
        brand_id: brandId,
        template_id: 'slack_notification',
        config: {
          webhook_url: 'https://hooks.slack.test/services/TEST',
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.integration_id).toBeTruthy();
    integrationId = body.integration_id;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. Bulk Import
// ═══════════════════════════════════════════════════════════════════════════
test.describe('18. Bulk Import', () => {
  test('18.1 Import with base64 CSV', async ({ request }) => {
    const csvContent = `full_name,email,phone,domain,city\nImport1_${TS},import1_${TS}@test.com,+919876500001,ed_tech,Mumbai\nImport2_${TS},import2_${TS}@test.com,+919876500002,ed_tech,Delhi`;
    const b64 = Buffer.from(csvContent).toString('base64');
    const res = await request.post(`${BASE}/import/leads`, {
      data: {
        brand_id: brandId,
        csv_base64: b64,
        filename: `import_${TS}.csv`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.import_id).toBeTruthy();
    expect(body.total_rows).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 19. Consent i18n
// ═══════════════════════════════════════════════════════════════════════════
test.describe('19. Consent i18n', () => {
  test('19.1 List supported languages (8+)', async ({ request }) => {
    const res = await request.get(`${BASE}/consent/languages`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(8);
  });

  test('19.2 Get consent form in Hindi', async ({ request }) => {
    const res = await request.get(`${BASE}/consent/form/hi`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.language).toBe('hi');
    expect(body.title).toBeTruthy();
  });

  test('19.3 Record consent with language', async ({ request }) => {
    const res = await request.post(`${BASE}/consent/record`, {
      data: {
        lead_id: leadId,
        language: 'te',
        purpose: 'marketing',
        consent_given: true,
        ip_address: '127.0.0.1',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.consent_id).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 20. Bot
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('20. Bot', () => {
  test('20.1 Trigger bot run', async ({ request }) => {
    const res = await request.post(`${BASE}/bot/run`, {
      data: {
        domains: ['ed_tech'],
        max_leads: 5,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.run_id).toBeTruthy();
  });

  test('20.2 Bot status', async ({ request }) => {
    const res = await request.get(`${BASE}/bot/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total_runs');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 21. Domains
// ═══════════════════════════════════════════════════════════════════════════
test.describe('21. Domains', () => {
  test('21.1 List all domains (27)', async ({ request }) => {
    const res = await request.get(`${BASE}/domains`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(27);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 22. Assignment Rules
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('22. Assignment Rules', () => {
  test('22.1 Create assignment rule', async ({ request }) => {
    const res = await request.post(`${BASE}/assignments/rules`, {
      data: {
        brand_id: brandId,
        name: `Rule_${TS}`,
        conditions: { domain: 'ed_tech', temperature: 'hot' },
        assign_to: 'rep_alpha@example.com',
        priority: 1,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.rule_id).toBeTruthy();
    assignmentRuleId = body.rule_id;
  });

  test('22.2 List rules for brand', async ({ request }) => {
    const res = await request.get(`${BASE}/assignments/rules/${brandId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 23. Stats / Dashboard
// ═══════════════════════════════════════════════════════════════════════════
test.describe('23. Stats', () => {
  test('23.1 Dashboard stats', async ({ request }) => {
    const res = await request.get(`${BASE}/stats`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total_brands');
    expect(body).toHaveProperty('total_leads');
    expect(body).toHaveProperty('conversion_rate');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 24. Rate Limits
// ═══════════════════════════════════════════════════════════════════════════
test.describe('24. Rate Limits', () => {
  test('24.1 Get rate limits for brand', async ({ request }) => {
    const res = await request.get(`${BASE}/rate-limits/${brandId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand_id).toBe(brandId);
  });

  test('24.2 Set custom rate limit', async ({ request }) => {
    const res = await request.post(`${BASE}/rate-limits/set`, {
      data: {
        brand_id: brandId,
        endpoint: '/leads',
        max_requests: 500,
      },
    });
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 25. Attribution
// ═══════════════════════════════════════════════════════════════════════════
test.describe('25. Attribution', () => {
  test('25.1 Record touchpoint', async ({ request }) => {
    const res = await request.post(`${BASE}/attribution/touchpoint`, {
      data: {
        lead_id: leadId,
        channel: 'website',
        campaign: 'e2e_test',
        touchpoint_type: 'first_click',
      },
    });
    expect(res.status()).toBe(200);
  });

  test('25.2 Get attribution journey', async ({ request }) => {
    const res = await request.get(`${BASE}/attribution/journey/${leadId}`);
    expect(res.status()).toBe(200);
  });

  test('25.3 Channel summary', async ({ request }) => {
    const res = await request.get(`${BASE}/attribution/channels`);
    expect(res.status()).toBe(200);
  });
});
