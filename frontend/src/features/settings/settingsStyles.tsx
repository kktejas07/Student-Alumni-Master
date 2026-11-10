// StyleSheet.create() — the `s` design-token object + the `previewStyles` Lexical-preview styles — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { StyleSheet, Platform } from 'react-native';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { GRAD_TO } from './settingsTokens';

/* ─────────────────────────────────────────────────────────────────
 * Styles
 * ───────────────────────────────────────────────────────────────── */
export const s = StyleSheet.create({
  // Top tab bar
  tabBarOuter: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
  },
  tabActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  tabActiveText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12.5 },
  tabInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  tabInactiveText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },

  // Cards
  card: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 20,
  },
  cardHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
  },
  cardTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.8 },

  iconBox: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  twoCol: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' as any },
  // Use s.card (defined above) for card styles

  // Profile
  avatarLg: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 24 },
  h1: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 },
  subtle: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5 },
  pillGrad: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillGradText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.4 },
  pillGreen: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillGreenText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 10.5 },
  pillNeutral: { backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillNeutralText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5,
    ...(Platform.OS === 'web' ? ({ fontFamily: 'SpaceMono, "SF Mono", monospace' } as any) : {}),
  },
  label: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  valueText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13 },
  valueGrad: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 12.5 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: SAC.green },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  fieldLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, width: 130 },
  fieldValue: { color: SAC.text, fontFamily: FONTS.med, fontSize: 13, flex: 1, textAlign: 'right' },
  input: {
    color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10, flex: 1,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  linkBtnText: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 12 },

  // Platform Controls
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 4,
  },
  toggleTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, flex: 1, marginRight: 8 },
  toggleDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  systemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: SAC.border, gap: 8,
  },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    minWidth: 140, maxWidth: 200,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  editBtnText: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 11 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    minWidth: 140, maxWidth: 200,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectValue: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 12, flex: 1 },

  // Picker Modal
  pickerBackdrop: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: SAC.panel2,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  pickerCard: {
    width: '100%', maxWidth: 440,
    backgroundColor: SAC.bg2, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(251,146,60,0.25)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  pickerHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  pickerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  pickerSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  credentialBody: {
    padding: 16,
    gap: 12,
  },
  credentialHelp: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    lineHeight: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: SAC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  credentialLabel: {
    color: SAC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    marginBottom: 6,
  },
  credentialInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  credentialInput: {
    flex: 1,
    minWidth: 0,
    color: SAC.text,
    fontSize: 14,
    fontFamily: FONTS.med,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  iconOnlyBtn: {
    padding: 4,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(251,146,60,0.10)',
    borderColor: 'rgba(251,146,60,0.30)',
  },
  pickerOptionRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: SAC.border2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pickerRadioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: GRAD_TO,
  },
  pickerOptionText: { color: SAC.text, fontFamily: FONTS.med, fontSize: 13, flex: 1 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: SAC.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Old dropdown styles (kept for reference, not used)
  dropdown: {},
  dropdownItem: {},
  dropdownItemActive: {},
  dropdownItemText: {},
  editBtnFull: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SAC.border,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  iconDangerBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  dangerBtnText: { color: SAC.red, fontFamily: FONTS.bold, fontSize: 12 },

  // Integrations
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  searchWrap: {
    flex: 1, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: {
    flex: 1, color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  popularToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  popularToggleActive: {
    borderColor: 'rgba(251,146,60,0.55)',
    backgroundColor: 'rgba(251,146,60,0.10)',
  },
  popularToggleText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  emptyBox: {
    marginTop: 18, padding: 30, alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, borderColor: SAC.border,
    backgroundColor: SAC.cardSolid,
  },
  emptyTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14 },
  emptySub: {
    color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center',
    maxWidth: 360, lineHeight: 17,
  },
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  clearBtnText: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 12 },

  testResult: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1,
  },
  testResultOk:  { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' },
  testResultErr: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.30)' },
  testResultText: { fontFamily: FONTS.bold, fontSize: 12, flex: 1 },

  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, marginRight: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  catPillActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 6 },
  catPillText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  catPillActiveText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 11.5 },
  catLabel: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.6, marginBottom: 10 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: {
    width: 240, minHeight: 170, padding: 14, borderRadius: 12,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, position: 'relative',
  },
  toolIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  toolName: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13 },
  toolDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 10, lineHeight: 15.5, minHeight: 30 },
  toolBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8,
  },
  toolBtnText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  toolBtnSec: {
    marginTop: 10, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toolBtnSecText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  connectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)',
  },
  connectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SAC.green },
  connectedPillText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3 },
  disconnectedPill: {
    marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border,
  },
  disconnectedPillText: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3 },
  popPill: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  popPillText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.6 },

  // Roles
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  roleCard: {
    width: 280, minHeight: 200, padding: 16, borderRadius: 12,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    flexDirection: 'column',
  },
  roleBadge: {
    width: 40, height: 40, borderRadius: 999, borderWidth: 1.4,
    alignItems: 'center', justifyContent: 'center',
  },
  roleBadgeText: { fontFamily: FONTS.xbold, fontSize: 13.5 },
  roleName: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13.5 },
  permLine: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, flex: 1 },
  sysPill: { backgroundColor: 'rgba(251,146,60,0.16)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(251,146,60,0.40)' },
  sysPillText: { color: '#FB923C', fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.8 },

  // Notifications
  notifHeadRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 14,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  notifHead: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },

  // Security
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 4,
  },
  inputIconBtn: {
    width: 32, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  sessRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: SAC.border,
  },
  sessIcon: { width: 32, height: 32, marginTop: 2, borderRadius: 8, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)' },
  activeChipText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 10.5 },
  revokeBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  revokeBtnText: { color: SAC.red, fontFamily: FONTS.xbold, fontSize: 11 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  logDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GRAD_TO, marginTop: 5 },
  logAction: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5 },

  trustBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: 'rgba(16,185,129,0.08)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  trustBtnText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 11 },
  trustedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)',
  },
  trustedIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', alignItems: 'center', justifyContent: 'center' },

  // Digital ID
  idCard: {
    padding: 6, borderRadius: 22,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 30px 70px rgba(217,119,6,0.30)' } as any) : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } }),
  },
  idOrg: { color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 2 },
  idLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  idBadge: { backgroundColor: 'rgba(31,17,7,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(31,17,7,0.25)' },
  idBadgeText: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1 },
  idName: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5 },
  idTitle: { color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 13, marginTop: 4 },
  idAdminLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1.4 },
  idAdminVal: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 19,
    ...(Platform.OS === 'web' ? ({ fontFamily: 'SpaceMono, "SF Mono", monospace' } as any) : {}),
  },
  qrBox: { width: 106, height: 106, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  idFlipHint: { color: 'rgba(31,17,7,0.7)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  idFlipHintDark: { color: 'rgba(251,191,36,0.7)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  flipOrg: { color: 'rgba(251,191,36,0.9)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  flipTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  flipSub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', marginTop: 2 },
  flipDataLabel: { color: 'rgba(251,191,36,0.7)', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.4 },
  flipQrData: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },
  idActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  idActionText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  featCard: {
    flex: 1, minWidth: 220, padding: 16, borderRadius: 12,
    backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, gap: 8,
  },
  featIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13 },

  // Primary buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
  },
  primaryBtnText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  secondaryBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  secondaryBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: SAC.red,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  // Modals
  modalBackdrop: {
    flex: 1, backgroundColor: SAC.panel2,
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 600, maxHeight: '90%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  modalSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  modalClose: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    padding: 14, borderTopWidth: 1, borderTopColor: SAC.border, backgroundColor: SAC.card,
  },
  helpBox: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)',
    alignItems: 'flex-start',
  },
  helpText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16, flex: 1 },
  helpInline: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, lineHeight: 14 },
  docLink: { flexDirection: 'row', alignItems: 'center', gap: 5,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  docLinkText: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 11.5, textDecorationLine: 'underline' },

  permGroup: { backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, padding: 10 },
  permGroupTitle: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkbox: { width: 17, height: 17, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  permLabel: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  permId: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10,
    ...(Platform.OS === 'web' ? ({ fontFamily: 'SpaceMono, "SF Mono", monospace' } as any) : {}),
  },
  errorText: { color: SAC.red, fontFamily: FONTS.bold, fontSize: 12 },

  // Signature editor
  sigPreview: {
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border,
    padding: 14, marginTop: 14, gap: 2,
  },
  sigPreviewLine:      { color: SAC.text,  fontFamily: FONTS.med,   fontSize: 12.5, lineHeight: 17 },
  sigPreviewLineFirst: { color: SAC.text,    fontFamily: FONTS.xbold, fontSize: 13 },
  sigEditor: {
    minHeight: 130, paddingHorizontal: 12, paddingTop: 10,
    color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, borderRadius: 10,
    textAlignVertical: 'top' as any, marginTop: 6,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  tplChip: {
    paddingHorizontal: 12, height: 28, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tplChipText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11 },

  // Role drill-in
  roleDetailHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  roleDetailBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, height: 30, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  roleDetailBackText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  roleDetailTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 },
  roleDetailSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  roleStatRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  roleStat: {
    flex: 1, minWidth: 140,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  roleStatLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },
  roleStatValue: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 22, marginTop: 4 },
  roleUserRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10, backgroundColor: SAC.cardSolid,
    borderWidth: 1, borderColor: SAC.border,
  },
  roleUserAv: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.32)', borderWidth: 1 },
  roleUserName: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12.5 },
  roleUserMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
});

export const previewStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chrome: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    color: SAC.text,
    fontFamily: 'DMSans_700Bold, DMSansBold, sans-serif',
    fontSize: 26,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
  },
  divider: {
    height: 2,
    backgroundColor: '#F59E0B',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  scrollArea: {
    maxHeight: 500,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hint: {
    color: '#64748b',
    fontFamily: FONTS.med,
    fontSize: 10.5,
    paddingHorizontal: 4,
  },
});
