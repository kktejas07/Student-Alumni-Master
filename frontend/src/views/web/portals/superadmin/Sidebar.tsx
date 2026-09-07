// @ts-nocheck
/**
 * Super Admin Portal — left sidebar.
 * Design: SA New Theme reference (DESIGN-HANDOFF §5, sidebar = 264px).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Building2, GraduationCap, UserCheck, Users, Calendar, CreditCard,
  BarChart3, CheckCircle, Sparkles, Settings, Workflow, LogOut,
  Upload, Handshake, Megaphone, UserPlus, Mail, Award, ShieldOff, ShieldCheck, Bot, Radar,
  Video, Store, Tag, GitPullRequest,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from './tokens';
import { Badge } from './atoms';
import { GRAD } from './applekit';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { SALogo } from '@/src/views/components';

/* ─── SA Shield SVG (from reference) ──────────────────────────────────── */
function SAShield({ size = 34 }: { size?: number }) {
  const h = size;
  const w = Math.round(size * 0.857);
  return (
    <svg width={w} height={h} viewBox="0 0 300 350">
      <defs>
        <linearGradient id="sa-shield-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9E7BFF" />
          <stop offset="1" stopColor="#5B3FD9" />
        </linearGradient>
      </defs>
      <path
        d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
        fill="url(#sa-shield-bg)"
      />
      <text
        x="150" y="212" textAnchor="middle"
        style={{ fontFamily: "'Outfit', sans-serif", fontSize: 124, fontWeight: 700, letterSpacing: -4, fill: '#FFFFFF' }}
      >
        SA
      </text>
    </svg>
  );
}

/* ─── Nav items ───────────────────────────────────────────────────────── */

export type SuperAdminNavId =
  | 'overview' | 'agents' | 'visitor-radar' | 'bgv' | 'colleges' | 'students' | 'mentors' | 'alumni' | 'events'
  | 'payments' | 'analytics' | 'approvals' | 'ai-insights' | 'settings'
  | 'workflows' | 'imports' | 'partners' | 'promotions' | 'talent-pool' | 'echo-showcase'
  | 'vendors' | 'coupons' | 'newsletter' | 'certificates' | 'email-health' | 'teams' | 'cicd-evaluator';

export const NAV: Array<{ id: SuperAdminNavId; label: string; Icon: any; count?: number; tag?: string }> = [
  { id: 'overview',        label: 'Overview',            Icon: LayoutDashboard,  count: 0 },
  { id: 'visitor-radar',   label: 'Live Visitor Radar',  Icon: Radar,            tag: 'NEW' },
  { id: 'agents',          label: 'Autonomous Agents',   Icon: Bot,              tag: 'NEW' },
  { id: 'cicd-evaluator',  label: 'CI/CD PR Evaluator',  Icon: GitPullRequest,   tag: 'NEW' },
  { id: 'bgv',             label: 'BGV & Accounts',      Icon: ShieldCheck,      tag: 'NEW' },
  { id: 'colleges',        label: 'Colleges',            Icon: Building2 },
  { id: 'students',        label: 'Students',            Icon: GraduationCap },
  { id: 'mentors',         label: 'Mentors',             Icon: UserCheck },
  { id: 'alumni',          label: 'Alumni',              Icon: Users },
  { id: 'talent-pool',     label: 'Talent Pool',         Icon: UserPlus,         tag: 'NEW' },
  { id: 'imports',         label: 'Import Contacts',     Icon: Upload,           tag: 'NEW' },
  { id: 'events',          label: 'Events',              Icon: Calendar },
  { id: 'echo-showcase',   label: 'Echo Showcase',       Icon: Sparkles,         tag: 'CMS' },
  { id: 'vendors',         label: 'Marketplace Vendors', Icon: Store,            tag: 'NEW' },
  { id: 'coupons',         label: 'Coupons',             Icon: Tag,              tag: 'NEW' },
  { id: 'partners',        label: 'Partners',            Icon: Handshake,        tag: 'NEW' },
  { id: 'promotions',      label: 'Promotions',          Icon: Megaphone,        tag: 'NEW' },
  { id: 'newsletter',      label: 'Newsletter',          Icon: Mail,             tag: 'NEW' },
  { id: 'email-health',    label: 'Email health',        Icon: ShieldOff,        tag: 'NEW' },
  { id: 'certificates',    label: 'Certificates',        Icon: Award,            tag: 'NEW' },
  { id: 'payments',        label: 'Payments',            Icon: CreditCard },
  { id: 'analytics',       label: 'Analytics',           Icon: BarChart3 },
  { id: 'approvals',       label: 'Approvals',           Icon: CheckCircle,      count: 12 },
  { id: 'ai-insights',     label: 'AI Insights',         Icon: Sparkles,         count: 6 },
  { id: 'workflows',       label: 'Workflows',           Icon: Workflow,         tag: 'NEW' },
  { id: 'teams',           label: 'Teams Meetings',      Icon: Video,             tag: 'NEW' },
  { id: 'settings',        label: 'Settings',            Icon: Settings },
];

/* ─── Component ───────────────────────────────────────────────────────── */

function useAdminProfile() {
  const user = useAuthStore((s) => s.user);
  const name = displayName(user);
  return {
    name,
    email: user?.email || '',
    role: 'Super Admin',
    initials: displayInitials(user),
  };
}

export function Sidebar({
  active, onNav, onLogout,
}: { active: SuperAdminNavId; onNav: (id: SuperAdminNavId) => void; onLogout: () => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const profile = useAdminProfile();

  return (
    <View style={s.aside}>
      {/* ── Brand header ── */}
      <View style={s.brand}>
        <SALogo size={30} variant="glass" />
        <View style={{ flex: 1, minWidth: 0 }} className="db-mini-hide">
          <Text style={s.brandTitle}>Student Alumni</Text>
          <Text style={s.brandSub}>Web Dashboard</Text>
        </View>
      </View>

      {/* ── User identity ── */}
      <View style={s.userBlock} className="db-mini-hide">
        <Text numberOfLines={1} style={s.userName}>{profile.name}</Text>
        <Text numberOfLines={1} style={s.userRole}>{profile.role}</Text>
      </View>

      {/* ── Agent K card ── */}
      <View style={s.agentKCard} className="db-mini-hide">
        <View style={s.agentKHeader}>
          <View style={s.agentKIcon}>
            <Bot size={14} color="#FFFFFF" />
          </View>
          <Text style={s.agentKLabel}>AGENT K</Text>
          <View style={s.agentKBadge}>
            <Text style={s.agentKBadgeText}>BETA</Text>
          </View>
        </View>
        <Text style={s.agentKTitle}>Run automations</Text>
        <Text style={s.agentKDesc}>Let AI handle multi-step tasks for you</Text>
      </View>

      {/* ── Navigation ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon, count, tag }) => {
          const isActive = id === active;
          const tourId = `superadmin-nav-${id}`;
          if (isActive) {
            return (
              <Pressable key={id} onPress={() => onNav(id)} nativeID={tourId}>
                <LinearGradient
                  colors={[GRAD.from, GRAD.to]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.navItem}
                >
                  <Icon size={17} color="#FFFFFF" />
                  <Text style={s.navLabelActive} numberOfLines={1}>{label}</Text>
                  {/* White dot indicator for active nav */}
                  <View style={s.navDot} />
                  {count != null && count > 0 && (
                    <View style={s.countPillActive}>
                      <Text style={s.countTextActive}>{count}</Text>
                    </View>
                  )}
                  {tag && <Badge label={tag} color="amber" />}
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={id}
              onPress={() => onNav(id)}
              nativeID={tourId}
              style={({ hovered }: any) => [s.navItemInactive, hovered && s.navItemHover]}
            >
              <Icon size={17} color={T.muted} />
              <Text style={s.navLabel} numberOfLines={1}>{label}</Text>
              {count != null && count > 0 && (
                <View style={s.countPill}>
                  <Text style={s.countText}>{count}</Text>
                </View>
              )}
              {tag && <Badge label={tag} color="orange" />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Footer: logout ── */}
      <Pressable
        onPress={onLogout}
        style={({ hovered }: any) => [s.footer, hovered && { backgroundColor: T.dangerTint }]}
        testID="logout-button"
      >
        <LogOut size={16} color={T.danger} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[s.footerName]}>{profile.name}</Text>
          <Text numberOfLines={1} style={[s.footerEmail]}>{profile.email}</Text>
        </View>
      </Pressable>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  aside: {
    width: 264,
    height: '100%' as any,
    backgroundColor: SAC.panel,
    borderRightWidth: 1,
    borderRightColor: SAC.line,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative' as const,
    zIndex: 2,
  },

  /* Brand */
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: SAC.line,
  },
  brandTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 15, letterSpacing: -0.2 },
  brandSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 1 },

  /* User identity */
  userBlock: {
    padding: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: SAC.line,
    alignItems: 'center',
  },
  userName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 15, textAlign: 'center' },
  userRole: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2, textAlign: 'center' },

  /* Agent K card */
  agentKCard: {
    margin: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SAC.accentLine,
    backgroundColor: SAC.panel2,
    position: 'relative',
    overflow: 'hidden',
  },
  agentKHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 11,
  },
  agentKIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: SAC.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentKLabel: {
    color: SAC.text,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    flex: 1,
  },
  agentKBadge: {
    borderWidth: 1,
    borderColor: SAC.sky,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  agentKBadgeText: {
    color: SAC.sky,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  agentKTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, marginBottom: 4 },
  agentKDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },

  /* Navigation */
  navItemInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 40,
    paddingHorizontal: 13,
    marginHorizontal: 8,
    borderRadius: 10,
    fontSize: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'background .2s ease, color .2s ease' } as any) : {}),
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 40,
    paddingHorizontal: 13,
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer',
      boxShadow: '0 8px 22px rgba(124,92,252,.28)',
    } as any) : {}),
  },
  navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.9, flexShrink: 0 },
  navItemHover: {
    backgroundColor: SAC.tint,
    ...(Platform.OS === 'web' ? ({ color: SAC.text } as any) : {}),
  },
  navLabel: {
    color: SAC.muted,
    fontFamily: FONTS.semi,
    fontSize: 14,
    flex: 1,
  },
  navLabelActive: {
    color: SAC.text,
    fontFamily: FONTS.semi,
    fontSize: 14,
    flex: 1,
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: SAC.warnTint,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    color: SAC.amber,
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  countPillActive: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    minWidth: 20,
    alignItems: 'center',
  },
  countTextActive: {
    color: SAC.text,
    fontFamily: FONTS.bold,
    fontSize: 10,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SAC.line,
    backgroundColor: SAC.panel,
    marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  footerName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  footerEmail: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
});
