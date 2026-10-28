// SettingsView — re-export stub (audit Step 6c).
//
// The original 4010-line component was cut verbatim into 15 modules under
// src/features/settings/ (settingsTokens, settingsEntry, settingsProfile,
// settingsPlatform, settingsIntegrations, settingsRoles, settingsNotifs,
// settingsSecurity, settingsDigitalId, settingsPages, settingsBranding,
// settingsTemplates, settingsEchoHero, settingsWidgets, settingsStyles).
// This named re-export keeps the existing
// `import { SettingsView } from './views/SettingsView'` (SuperAdminPortalRN)
// working; new code should import the feature modules directly.
// @ts-nocheck
export { SettingsView } from '@/src/features/settings/settingsEntry';
