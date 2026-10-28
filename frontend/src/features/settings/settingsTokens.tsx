// settings constants: TOOL_DOCS provider-docs map, GRAD_* colour tokens, TABS + DEFAULT_SYSTEM_OPTIONS, the shared types — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { UserCog, Sliders, Plug, Shield, Bell, Lock, IdCard, Sparkles, FileText } from 'lucide-react-native';

/* ─────────────────────────────────────────────────────────────────
 * Provider docs map — used by the "How to get credentials" link in
 * the Connect modal. Maintained by tool_id.
 * ───────────────────────────────────────────────────────────────── */
export const TOOL_DOCS: Record<string, string> = {
  'google-workspace': 'https://console.cloud.google.com/apis/credentials',
  'google-calendar' : 'https://console.cloud.google.com/apis/credentials',
  'outlook'         : 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
  'slack'           : 'https://api.slack.com/apps',
  'zoom'            : 'https://marketplace.zoom.us/develop/create',
  'whatsapp'        : 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  'gmail'           : 'https://console.cloud.google.com/apis/credentials',
  'sendgrid'        : 'https://app.sendgrid.com/settings/api_keys',
  'aws-s3'          : 'https://console.aws.amazon.com/iam/home#/security_credentials',
  'hubspot'         : 'https://app.hubspot.com/private-apps',
  'salesforce'      : 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm',
  'zoho'            : 'https://api-console.zoho.com',
  'notion'          : 'https://www.notion.so/my-integrations',
  'linear'          : 'https://linear.app/settings/api',
  'stripe'          : 'https://dashboard.stripe.com/apikeys',
  'razorpay'        : 'https://dashboard.razorpay.com/app/keys',
  'linkedin'        : 'https://www.linkedin.com/developers/apps',
  'twilio'          : 'https://console.twilio.com',
  'claude'          : 'https://console.anthropic.com/settings/keys',
  'openai'          : 'https://platform.openai.com/api-keys',
  'gemini'          : 'https://aistudio.google.com/apikey',
  'mistral'         : 'https://console.mistral.ai/api-keys/',
  'cohere'          : 'https://dashboard.cohere.com/api-keys',
  'perplexity'      : 'https://www.perplexity.ai/settings/api',
  'groq'            : 'https://console.groq.com/keys',
  'together-ai'     : 'https://api.together.xyz/settings/api-keys',
  'fireworks-ai'    : 'https://fireworks.ai/api-keys',
  'huggingface'     : 'https://huggingface.co/settings/tokens',
  'replicate'       : 'https://replicate.com/account/api-tokens',
  'stability'       : 'https://platform.stability.ai/account/keys',
  'openai-images'   : 'https://platform.openai.com/api-keys',
  'fal-ai'          : 'https://fal.ai/dashboard/keys',
  'runway'          : 'https://app.runwayml.com/account',
  'elevenlabs'      : 'https://elevenlabs.io/app/settings/api-keys',
  'openai-whisper'  : 'https://platform.openai.com/api-keys',
  'assemblyai'      : 'https://www.assemblyai.com/app/account',
  'deepgram'        : 'https://console.deepgram.com/api-keys',
  'deepl'           : 'https://www.deepl.com/account/summary',
  'google-translate': 'https://console.cloud.google.com/apis/credentials',
  'pinecone'        : 'https://app.pinecone.io/organizations/-/keys',
  'weaviate'        : 'https://console.weaviate.cloud/dashboard',
  'chroma'          : 'https://docs.trychroma.com/getting-started',
  'qdrant'          : 'https://cloud.qdrant.io/accounts/-/api-keys',
  'langsmith'       : 'https://smith.langchain.com/o/-/settings',
  'helicone'        : 'https://www.helicone.ai/developer',
  'agent-k'         : 'https://your-ai-provider.example/profile',
  'proxycurl'       : 'https://nubela.co/proxycurl/dashboard',
  'rchilli'         : 'https://www.rchilli.com/contact-us',
  'affinda'         : 'https://app.affinda.com/account/api-keys',
  'clearbit'        : 'https://dashboard.clearbit.com/api',
  'apollo'          : 'https://app.apollo.io/#/settings/integrations/api',
  'lever'           : 'https://hire.lever.co/settings/integrations',
  'greenhouse'      : 'https://app.greenhouse.io/configure/dev_center',
  'calendly'        : 'https://calendly.com/integrations/api_webhooks',
  'tally'           : 'https://tally.so/help/api',
  'typeform'        : 'https://admin.typeform.com/account#/section/tokens',
  'posthog'         : 'https://app.posthog.com/project/settings',
  'mixpanel'        : 'https://mixpanel.com/settings/project',
  'amplitude'       : 'https://app.amplitude.com/settings/projects',
  'sentry'          : 'https://sentry.io/settings/account/api/auth-tokens/',
  'datadog'         : 'https://app.datadoghq.com/organization-settings/api-keys',
  'github'          : 'https://github.com/settings/tokens',
};

/* ─────────────────────────────────────────────────────────────────
 * Design tokens — warm orange/amber gradient (matches screenshots)
 * Layered on top of NexusOS dark surfaces so it stays in-app.
 * ───────────────────────────────────────────────────────────────── */
export const GRAD_FROM = '#FB923C';  // orange 400
export const GRAD_TO   = '#F59E0B';  // amber  500
export const GRAD_DEEP = '#D97706';  // amber  600
export const GRAD_BG   = ['rgba(251,146,60,0.20)', 'rgba(245,158,11,0.10)'] as const;

/* ─────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────── */
export type TabId =
  | 'profile' | 'platform' | 'integrations' | 'roles'
  | 'notifications' | 'security' | 'digital-id' | 'pages' | 'templates' | 'branding' | 'echo-hero';

export type Tool = {
  id: string; name: string; category: string; icon: string; tint: string;
  description: string; auth_type: string; popular?: boolean;
  installed: boolean; status?: string | null; installed_at?: string | null;
  auth_fields?: Array<{ key: string; label: string; type: string; placeholder?: string; help?: string }>;
  credentials_masked?: Record<string, string>;
  credentials_plain?: Record<string, string>;
  webhook_url?: string;
};
export type Role = {
  id: string; key: string; name: string; description: string;
  is_system: boolean; permissions: string[]; user_count: number; created_at: string;
};
export type Permission = { id: string; group: string; label: string };
export type PermissionGroup = { group: string; items: Permission[] };

export const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'profile',       label: 'Manage Profile',      icon: UserCog },
  { id: 'platform',      label: 'Platform Controls',   icon: Sliders },
  { id: 'integrations',  label: 'Integrations',        icon: Plug },
  { id: 'roles',         label: 'Roles & Permissions', icon: Shield },
  { id: 'notifications', label: 'Notifications',       icon: Bell },
  { id: 'templates',     label: 'Templates',           icon: FileText },
  { id: 'echo-hero',     label: 'ECHO Landing Hero',   icon: Sparkles },
  { id: 'branding',      label: 'Branding',            icon: FileText },
  { id: 'security',      label: 'Security',            icon: Lock },
  { id: 'digital-id',    label: 'Digital ID',          icon: IdCard },
  { id: 'pages',         label: 'Pages',               icon: FileText },
];

export const DEFAULT_SYSTEM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  session_timeout: [
    { value: '15 minutes', label: '15 minutes' },
    { value: '30 minutes', label: '30 minutes' },
    { value: '1 hour',     label: '1 hour' },
    { value: '2 hours',    label: '2 hours' },
    { value: '4 hours',    label: '4 hours' },
    { value: '8 hours',    label: '8 hours' },
    { value: '12 hours',   label: '12 hours' },
    { value: '24 hours',   label: '24 hours' },
  ],
  password_policy: [
    { value: 'Weak (8+ chars)',        label: 'Weak (8+ chars)' },
    { value: 'Medium (10+ chars)',     label: 'Medium (10+ chars)' },
    { value: 'Strong (12+ chars)',    label: 'Strong (12+ chars)' },
    { value: 'Very Strong (16+ chars)',label: 'Very Strong (16+ chars)' },
    { value: 'Maximum (20+ chars)',   label: 'Maximum (20+ chars)' },
  ],
  default_locale: [
    { value: 'en-IN', label: 'English (India) — en-IN' },
    { value: 'en-US', label: 'English (US) — en-US' },
    { value: 'en-GB', label: 'English (UK) — en-GB' },
    { value: 'hi-IN', label: 'Hindi — hi-IN' },
    { value: 'ta-IN', label: 'Tamil — ta-IN' },
    { value: 'bn-IN', label: 'Bengali — bn-IN' },
    { value: 'te-IN', label: 'Telugu — te-IN' },
    { value: 'mr-IN', label: 'Marathi — mr-IN' },
  ],
  default_tz: [
    { value: 'Asia/Kolkata',       label: 'IST — Asia/Kolkata (UTC+5:30)' },
    { value: 'UTC',                label: 'UTC — Coordinated Universal Time' },
    { value: 'Asia/Dubai',        label: 'GST — Asia/Dubai (UTC+4)' },
    { value: 'Asia/Singapore',     label: 'SGT — Asia/Singapore (UTC+8)' },
    { value: 'Asia/Tokyo',        label: 'JST — Asia/Tokyo (UTC+9)' },
    { value: 'America/New_York',   label: 'EST — America/New_York (UTC-5)' },
    { value: 'America/Chicago',    label: 'CST — America/Chicago (UTC-6)' },
    { value: 'America/Los_Angeles',label: 'PST — America/Los_Angeles (UTC-8)' },
    { value: 'Europe/London',     label: 'GMT — Europe/London (UTC+0)' },
    { value: 'Europe/Paris',      label: 'CET — Europe/Paris (UTC+1)' },
  ],
  default_currency: [
    { value: 'INR (₹)',  label: 'Indian Rupee — INR (₹)' },
    { value: 'USD ($)',  label: 'US Dollar — USD ($)' },
    { value: 'EUR (€)',  label: 'Euro — EUR (€)' },
    { value: 'GBP (£)',  label: 'British Pound — GBP (£)' },
    { value: 'AED',      label: 'UAE Dirham — AED' },
    { value: 'SGD',      label: 'Singapore Dollar — SGD' },
    { value: 'AUD ($)',  label: 'Australian Dollar — AUD ($)' },
    { value: 'CAD ($)',  label: 'Canadian Dollar — CAD ($)' },
  ],
  linkedin_oauth_client_id: [],
  linkedin_oauth_client_secret: [],
};
