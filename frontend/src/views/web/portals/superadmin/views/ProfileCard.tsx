/**
 * ProfileCard — Student/Alumni dashboard profile card.
 *
 * Matches the warm amber/orange admin theme exactly:
 *   • Near-black surface with brown-amber undertone
 *   • Orange→amber gradient on primary CTAs + glow
 *   • Avatar with category-tinted ring + status dot
 *   • Goals · Progress bar · Tag pills · Next-session sub-card
 *   • View Profile (gradient) + LinkedIn + GitHub action row
 *   • Hover lifts the card 2px and intensifies the border + amber glow
 *
 * Renders gracefully when optional sections (goals, progress, next session,
 * socials) are missing — never shows an empty inner shell.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Eye, ChevronRight, Calendar, Check, Play, Code, Sparkles,
  ShieldCheck, Trash2, Mail, Building2,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { GRAD } from '../applekit';

/** LinkedIn 'in' glyph — `lucide-react-native` doesn't ship the Linkedin icon
 *  in this version, so we render a compact text glyph instead. */
function LinkedinGlyph({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Text style={{
      color, fontSize: Math.round(size * 0.78),
      fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' as any : FONTS.xbold,
      fontWeight: '800' as any, letterSpacing: -0.5,
    }}>in</Text>
  );
}

/* ─── Tokens (per spec) ──────────────────────────────────────────── */
export const PC = {
  bgPage:           '#0B0703',
  cardBgFrom:       '#1A0F05',
  cardBgTo:         '#120A03',
  cardBorder:       'rgba(251,146,60,0.18)',
  cardBorderHover:  'rgba(251,146,60,0.38)',
  accent:           '#F97316',
  accentBright:     '#FB923C',
  accentDeep:       '#EA580C',
  statusActive:     '#FBBF24',
  statusActiveBg:   'rgba(251,191,36,0.10)',
  statusActiveBd:   'rgba(251,191,36,0.35)',
  textPrimary:      '#FFFFFF',
  textSecondary:    '#C4A788',
  textMuted:        '#8B6F52',
  textLabel:        '#6B5237',
  pillBg:           'rgba(255,255,255,0.04)',
  pillBorder:       'rgba(251,146,60,0.12)',
  trackBg:          'rgba(255,255,255,0.05)',
  linkedinBg:       '#0A66C2',
  githubBg:         '#1F1208',
  danger:           '#EF4444',
  dangerBg:         'rgba(239,68,68,0.08)',
} as const;

/* ─── Types ──────────────────────────────────────────────────────── */
export type ProfileCardCategory = 'student' | 'masters' | 'alumni' | 'mentor';
export type ProfileCardStatus   = 'active' | 'inactive' | 'archived';

export type ProfileCardProps = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    status: ProfileCardStatus;
    degree: string;
    institution: string;
    batchYear?: number;
    category: ProfileCardCategory;
    isNew?: boolean;          // newly imported, not yet approved
    approved?: boolean;
    onboardingCompleted?: boolean;
    careerPath?: string;
    aadhaarMasked?: string;
    aadhaarVerified?: boolean;
    digilockerVerified?: boolean;
    digilockerDocCount?: number;
    /* MT4 — mentor card enrichment (rendered only for category === 'mentor') */
    mentorStatus?: 'pending' | 'approved' | 'rejected';
    mentorTaxonomy?: string;
    mentorYears?: number;
    mentorPrice?: number;
    mentorExpertise?: string[];
    mentorAvailabilityDays?: any[];
    mentorSessionCount?: number;
    mentorMenteeCount?: number;
    mentorAvgRating?: number;
    mentorReviewCount?: number;
    mentorBadges?: string[];
  };
  goals?: string[];
  progress?: {
    percent: number;
    sessionsCompleted: number;
    sessionsTotal: number;
    cgpa?: number;
    label?: string;
  };
  tags?: string[];
  nextSession?: { dateISO: string; title: string };
  socials?: { linkedinUrl?: string; githubUrl?: string };
  onViewProfile: (userId: string) => void;
  onApprove?: (userId: string) => void;
  onRemove?: (userId: string) => void;
};

/* ─── Category accent dots (warm amber family) ───────────────────── */
const CAT_DOT: Record<ProfileCardCategory, { c: string; label: string }> = {
  student: { c: '#FCD34D', label: 'Student'  },  // amber-300
  masters: { c: '#F59E0B', label: "Master's" },  // amber-500
  alumni:  { c: '#D97706', label: 'Alumni'   },  // amber-600
  mentor:  { c: '#B45309', label: 'Mentor'   },  // amber-700
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (fn: string, ln: string) =>
  ((fn?.[0] || '') + (ln?.[0] || fn?.[1] || '')).toUpperCase() || '?';

function fmtNextSession(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch { return iso; }
}

/* ────────────────────────────────────────────────────────────────────
 *  ActionTooltip — Instant Floating Tooltip for Web & Mobile
 * ────────────────────────────────────────────────────────────────── */
function ActionTooltip({
  text,
  children,
  position = 'top',
  align = 'center',
}: {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'center' | 'right' | 'left';
}) {
  const [hovered, setHovered] = React.useState(false);

  if (!text) return <>{children}</>;

  return (
    <View
      style={{ position: 'relative', alignItems: 'center' }}
      // @ts-ignore — web hover events
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={[
            s.customTooltip,
            position === 'top' ? s.tooltipTop : s.tooltipBottom,
            align === 'right' ? { right: 0, alignItems: 'flex-end' } :
            align === 'left' ? { left: 0, alignItems: 'flex-start' } :
            { alignSelf: 'center' },
          ]}
        >
          <Text style={s.customTooltipText} numberOfLines={1}>
            {text}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */
export function ProfileCard(props: ProfileCardProps) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { user, goals, progress, tags, nextSession, socials, onViewProfile, onApprove, onRemove } = props;
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown user';
  const cat = CAT_DOT[user.category] || CAT_DOT.student;
  const visibleGoals = (goals || []).slice(0, 2);
  const overflow = (goals?.length || 0) - visibleGoals.length;
  const isComplete = (progress?.percent ?? 0) >= 100;
  const isNew = !!user.isNew && !user.approved;
  const showApprove = !!onApprove && !user.approved;
  const showRemove = !!onRemove;
  const initialsStr = initials(user.firstName, user.lastName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${fullName}`}
      onPress={() => onViewProfile(user.id)}
      style={({ hovered, focused }: any) => [
        s.card,
        hovered && Platform.OS === 'web' ? s.cardHover : null,
        focused ? s.cardFocus : null,
      ]}
    >
      <View style={s.cardInner}>
        {isNew ? (
          <View style={s.newPill}>
            <Text style={s.newPillText}>NEW</Text>
          </View>
        ) : null}

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <View style={[s.avatar, { borderColor: PC.accent }]}>
              <Text style={s.avatarText}>{initialsStr}</Text>
            </View>
            <View style={[s.statusDot, {
              backgroundColor:
                user.status === 'active' ? PC.statusActive :
                user.status === 'archived' ? PC.danger : PC.textMuted,
            }]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={s.name} numberOfLines={1}>{fullName}</Text>
              <View style={[s.catDot, { backgroundColor: cat.c }]} />
              <Text style={s.catLabel}>{cat.label}</Text>
            </View>
            <Text style={s.degree} numberOfLines={1}>
              {user.degree || '—'}{user.institution ? ` · ${user.institution}` : ''}
            </Text>
            {user.email ? (
              <ActionTooltip text={`Copy email: ${user.email}`} align="left">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Mail size={11} color={PC.textSecondary} />
                  <Text style={{ color: PC.textSecondary, fontSize: 11, fontFamily: FONTS.med }} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </ActionTooltip>
            ) : null}
            {user.batchYear ? (
              <Text style={s.idLine} numberOfLines={1}>Batch {user.batchYear}</Text>
            ) : null}
          </View>
          <StatusPillCard status={user.status} />
        </View>

        {/* ONBOARDING & CAREER BADGES */}
        {(user.onboardingCompleted !== undefined || user.careerPath) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {user.onboardingCompleted !== undefined && (
              <View style={[s.tag, {
                backgroundColor: user.onboardingCompleted ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                borderColor: user.onboardingCompleted ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)',
              }]}>
                <Text style={[s.tagText, { color: user.onboardingCompleted ? '#86EFAC' : '#FCD34D', fontSize: 10, fontWeight: '700' }]}>
                  {user.onboardingCompleted ? '✓ Onboarded' : '⏳ Pending Onboarding'}
                </Text>
              </View>
            )}
            {user.careerPath ? (
              <View style={[s.tag, { backgroundColor: 'rgba(251,146,60,0.12)', borderColor: 'rgba(251,146,60,0.30)' }]}>
                <Text style={[s.tagText, { color: '#FDBA74', fontSize: 10, fontWeight: '700' }]} numberOfLines={1}>
                  🎯 {user.careerPath}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* MENTOR STRIP — category, years, price, expertise, rating, badges (MT4) */}
        {user.category === 'mentor' ? (
          <View style={[s.tagRow, { marginTop: 12 }]}>
            {user.mentorTaxonomy ? (
              <View style={[s.tag, { backgroundColor: 'rgba(251,146,60,0.14)', borderColor: 'rgba(251,146,60,0.38)' }]}>
                <Text style={[s.tagText, { color: '#FDBA74' }]} numberOfLines={1}>{user.mentorTaxonomy}</Text>
              </View>
            ) : null}
            {user.mentorYears != null ? (
              <View style={s.tag}>
                <Text style={s.tagText} numberOfLines={1}>{user.mentorYears} yrs exp</Text>
              </View>
            ) : null}
            {user.mentorPrice != null ? (
              <View style={s.tag}>
                <Text style={s.tagText} numberOfLines={1}>₹{Number(user.mentorPrice).toLocaleString('en-IN')}/session</Text>
              </View>
            ) : null}
            {user.mentorAvgRating ? (
              <View style={[s.tag, { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' }]}>
                <Text style={[s.tagText, { color: '#FCD34D' }]} numberOfLines={1}>
                  ★ {Number(user.mentorAvgRating).toFixed(1)}{user.mentorReviewCount ? ` (${user.mentorReviewCount})` : ''}
                </Text>
              </View>
            ) : null}
            {user.mentorSessionCount ? (
              <View style={s.tag}>
                <Text style={s.tagText} numberOfLines={1}>{user.mentorSessionCount} sessions</Text>
              </View>
            ) : null}
            {user.mentorMenteeCount ? (
              <View style={s.tag}>
                <Text style={s.tagText} numberOfLines={1}>{user.mentorMenteeCount} mentees</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {user.category === 'mentor' && (user.mentorExpertise || []).length > 0 ? (
          <View style={s.tagRow}>
            {(user.mentorExpertise || []).slice(0, 5).map((e: string, i: number) => (
              <View key={i} style={s.tag}><Text style={s.tagText}>{e}</Text></View>
            ))}
          </View>
        ) : null}
        {user.category === 'mentor' && (user.mentorBadges || []).length > 0 ? (
          <View style={s.tagRow}>
            {(user.mentorBadges || []).slice(0, 3).map((b: string, i: number) => (
              <View key={i} style={[s.tag, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)' }]}>
                <Text style={[s.tagText, { color: '#86EFAC' }]} numberOfLines={1}>🏅 {b.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {user.category === 'mentor' && user.mentorStatus === 'pending' ? (
          <View style={[s.tagRow, { marginTop: 6 }]}>
            <View style={[s.tag, { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.40)' }]}>
              <Text style={[s.tagText, { color: '#FCD34D' }]}>⏳ Pending Review</Text>
            </View>
          </View>
        ) : null}
        {user.category === 'mentor' && user.mentorStatus === 'rejected' ? (
          <View style={[s.tagRow, { marginTop: 6 }]}>
            <View style={[s.tag, { backgroundColor: PC.dangerBg, borderColor: 'rgba(239,68,68,0.35)' }]}>
              <Text style={[s.tagText, { color: '#FCA5A5' }]}>Rejected</Text>
            </View>
          </View>
        ) : null}

        {/* GOALS */}
        {visibleGoals.length > 0 ? (
          <View style={{ gap: 8, marginTop: 14 }}>
            {visibleGoals.map((g, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={12} color={PC.accentBright} />
                <Text numberOfLines={1} style={s.goalText}>{g}</Text>
              </View>
            ))}
            {overflow > 0 ? <Text style={s.muted}>+ {overflow} more</Text> : null}
          </View>
        ) : null}

        {/* PROGRESS */}
        {progress && (progress.percent > 0 || progress.sessionsTotal > 0) ? (
          <View style={{ marginTop: 16, gap: 8 }}>
            <View style={s.progressHeader}>
              <Text style={s.sectionLabel}>PROGRESS</Text>
              <Text style={[s.percent, isComplete ? { color: PC.accentBright } : null]}>
                {Math.round(progress.percent)}%
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[
                s.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                  backgroundColor: isComplete ? PC.accentBright : PC.accent,
                },
              ]} />
            </View>
            {(progress.sessionsTotal > 0 || progress.cgpa) ? (
              <View style={s.progressMeta}>
                <Text style={s.metaCount}>{progress.sessionsCompleted}</Text>
                <Text style={s.metaMuted}>/ {progress.sessionsTotal} sessions</Text>
                {progress.cgpa ? (
                  <Text style={s.metaMuted}>  ·  CGPA {progress.cgpa.toFixed(1)}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* IDENTITY & DIGILOCKER BADGES */}
        {(user.aadhaarMasked || user.aadhaarVerified || user.digilockerVerified) ? (
          <View style={[s.tagRow, { marginTop: 4, marginBottom: 2 }]}>
            {(user.aadhaarMasked || user.aadhaarVerified) && (
              <View style={[s.tag, { backgroundColor: user.aadhaarVerified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', borderColor: user.aadhaarVerified ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)' }]}>
                <Text style={[s.tagText, { color: user.aadhaarVerified ? '#34D399' : '#FBBF24', fontSize: 10, fontWeight: '700' }]}>
                  {user.aadhaarVerified ? '✓ UIDAI' : 'Aadhaar'}: {user.aadhaarMasked || '•••• 1234'}
                </Text>
              </View>
            )}
            {user.digilockerVerified && (
              <View style={[s.tag, { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.40)' }]}>
                <Text style={[s.tagText, { color: '#C4B5FD', fontSize: 10, fontWeight: '700' }]}>
                  ⚡ DigiLocker ({user.digilockerDocCount || 3} Docs)
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* TAGS */}
        {(tags || []).length > 0 ? (
          <View style={s.tagRow}>
            {(tags || []).slice(0, 4).map((t, i) => (
              <View key={i} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
            ))}
          </View>
        ) : null}

        {/* NEXT SESSION */}
        {nextSession ? (
          <View style={s.nextCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} color={PC.accentBright} />
              <Text style={s.nextLabel}>Next Session</Text>
            </View>
            <Text style={s.nextDate}>{fmtNextSession(nextSession.dateISO)}</Text>
            <Text style={s.nextTitle} numberOfLines={1}>{nextSession.title}</Text>
          </View>
        ) : null}

        {/* APPROVE / REMOVE */}
        {showApprove ? (
          <View style={s.adminRow}>
            <ActionTooltip text={`Approve student account: ${fullName}`}>
              <Pressable
                accessibilityLabel={`Approve profile of ${fullName}`}
                onPress={(e: any) => { e?.stopPropagation?.(); onApprove?.(user.id); }}
                style={s.approveBtn}
              >
                <ShieldCheck size={12} color={PC.statusActive} />
                <Text style={[s.approveText, { color: PC.statusActive }]}>Approve</Text>
              </Pressable>
            </ActionTooltip>
          </View>
        ) : null}

        {/* ACTION ROW */}
        <View style={s.actionRow}>
          <ActionTooltip text={`View profile of ${fullName}`}>
            <Pressable
              accessibilityLabel={`View profile of ${fullName}`}
              onPress={(e: any) => { e?.stopPropagation?.(); onViewProfile(user.id); }}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={[PC.accentBright, PC.accent, PC.accentDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.viewBtn}
              >
                <Eye size={14} color="#fff" />
                <Text style={s.viewBtnText}>View Profile</Text>
              </LinearGradient>
            </Pressable>
          </ActionTooltip>

          {showRemove ? (
            <ActionTooltip text={`Delete profile: ${fullName}`}>
              <Pressable
                accessibilityLabel={`Remove profile of ${fullName}`}
                onPress={(e: any) => { e?.stopPropagation?.(); onRemove?.(user.id); }}
                style={[s.socialBtn, { backgroundColor: PC.dangerBg, borderColor: 'rgba(239,68,68,0.30)', borderWidth: 1 }]}
              >
                <Trash2 size={16} color={'#FCA5A5'} />
              </Pressable>
            </ActionTooltip>
          ) : null}

          {socials?.linkedinUrl ? (
            <ActionTooltip text="Open LinkedIn profile">
              <Pressable
                accessibilityLabel={`Open LinkedIn of ${fullName}`}
                onPress={(e: any) => { e?.stopPropagation?.(); openSocial(socials.linkedinUrl!); }}
                style={[s.socialBtn, { backgroundColor: PC.linkedinBg }]}
              >
                <LinkedinGlyph size={16} color="#fff" />
              </Pressable>
            </ActionTooltip>
          ) : null}
          {socials?.githubUrl ? (
            <ActionTooltip text="Open GitHub profile">
              <Pressable
                accessibilityLabel={`Open GitHub of ${fullName}`}
                onPress={(e: any) => { e?.stopPropagation?.(); openSocial(socials.githubUrl!); }}
                style={[s.socialBtn, { backgroundColor: PC.githubBg, borderColor: PC.cardBorder, borderWidth: 1 }]}
              >
                <Code size={16} color="#fff" />
              </Pressable>
            </ActionTooltip>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function openSocial(url: string) {
  try {
    if (Platform.OS === 'web') {
      // @ts-ignore
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch {}
}

function StatusPillCard({ status }: { status: ProfileCardStatus }) {
  if (status === 'active') {
    return (
      <View style={[s.statusPill, { backgroundColor: PC.statusActiveBg, borderColor: PC.statusActiveBd }]}>
        <View style={[s.statusInnerDot, { backgroundColor: PC.statusActive }]} />
        <Text style={[s.statusText, { color: PC.statusActive }]}>Active</Text>
      </View>
    );
  }
  if (status === 'archived') {
    return (
      <View style={[s.statusPill, { backgroundColor: PC.dangerBg, borderColor: 'rgba(239,68,68,0.35)' }]}>
        <Text style={[s.statusText, { color: '#FCA5A5' }]}>Archived</Text>
      </View>
    );
  }
  return (
    <View style={[s.statusPill, { backgroundColor: PC.pillBg, borderColor: PC.pillBorder }]}>
      <Text style={[s.statusText, { color: PC.textMuted }]}>Inactive</Text>
    </View>
  );
}

/* ─── Skeleton loader (page loader) ──────────────────────────────── */
export function ProfileCardSkeleton() {
  return (
    <View style={s.card}>
      <View style={s.cardInner}>
        <View style={[s.skBox, { width: '60%', height: 16, marginBottom: 8 }]} />
        <View style={[s.skBox, { width: '90%', height: 12, marginBottom: 6 }]} />
        <View style={[s.skBox, { width: '50%', height: 10, marginBottom: 20 }]} />
        <View style={[s.skBox, { width: '100%', height: 6, marginBottom: 14, borderRadius: 99 }]} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={[s.skBox, { width: 80, height: 22, borderRadius: 99 }]} />
          <View style={[s.skBox, { width: 90, height: 22, borderRadius: 99 }]} />
        </View>
        <View style={[s.skBox, { width: '100%', height: 48 }]} />
      </View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  card: {
    height: '100%',
    borderRadius: 20, borderWidth: 1, borderColor: PC.cardBorder,
    backgroundColor: PC.cardBgFrom,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 0 1px rgba(251,146,60,0.06), 0 10px 30px rgba(0,0,0,0.45)', transitionDuration: '200ms', cursor: 'pointer' } as any)
      : { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }),
  },
  cardHover: {
    borderColor: PC.cardBorderHover,
    transform: [{ translateY: -2 }],
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 0 1px rgba(251,146,60,0.18), 0 18px 44px rgba(0,0,0,0.55)' } as any) : {}),
  },
  cardFocus: { borderColor: PC.accent, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  cardInner: { padding: 22, borderRadius: 20, flex: 1 },

  newPill: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, zIndex: 5,
  },
  newPillText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 0.8 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: {
    width: 60, height: 60, borderRadius: 999, borderWidth: 2,
    backgroundColor: 'rgba(249,115,22,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 19 },
  statusDot: {
    position: 'absolute', right: -2, bottom: -2,
    width: 14, height: 14, borderRadius: 999,
    borderWidth: 2, borderColor: PC.bgPage,
  },

  name: { color: PC.textPrimary, fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.2 },
  catDot: { width: 6, height: 6, borderRadius: 4 },
  catLabel: { color: PC.textMuted, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },
  degree: { color: PC.textSecondary, fontFamily: FONTS.med, fontSize: 12.5 },
  idLine: { color: PC.textMuted, fontFamily: FONTS.med, fontSize: 11,
    ...(Platform.OS === 'web' ? ({ fontFamily: 'SpaceMono, "SF Mono", monospace' } as any) : {}) },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  statusInnerDot: { width: 6, height: 6, borderRadius: 4 },
  statusText: { fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.3 },

  goalText: { color: PC.textPrimary, fontFamily: FONTS.med, fontSize: 13, flex: 1 },
  muted: { color: PC.textMuted, fontFamily: FONTS.med, fontSize: 11, marginLeft: 20 },

  sectionLabel: { color: PC.textLabel, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.6 },
  percent: { color: PC.accentBright, fontFamily: FONTS.xbold, fontSize: 13 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: PC.trackBg, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 99 },
  progressMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  playSq: { width: 16, height: 16, borderRadius: 4, backgroundColor: PC.accent, alignItems: 'center', justifyContent: 'center' },
  metaCount: { color: PC.textPrimary, fontFamily: FONTS.bold, fontSize: 11.5 },
  metaMuted: { color: PC.textMuted, fontFamily: FONTS.med, fontSize: 11 },
  metaSep: { width: 1, height: 10, backgroundColor: PC.pillBorder, marginHorizontal: 4 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    paddingHorizontal: 11, paddingVertical: 4.5, borderRadius: 999,
    backgroundColor: PC.pillBg, borderWidth: 1, borderColor: PC.pillBorder,
  },
  tagText: { color: PC.textSecondary, fontFamily: FONTS.bold, fontSize: 11 },

  nextCard: {
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.22)', gap: 4,
  },
  nextLabel: { color: PC.accentBright, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.4 },
  nextDate:  { color: PC.textPrimary, fontFamily: FONTS.bold, fontSize: 12.5, marginTop: 2 },
  nextTitle: { color: PC.textSecondary, fontFamily: FONTS.med, fontSize: 11.5 },

  adminRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8,
    backgroundColor: PC.statusActiveBg, borderWidth: 1, borderColor: PC.statusActiveBd,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8,
    backgroundColor: PC.dangerBg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  approveText: { fontFamily: FONTS.xbold, fontSize: 11 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 16 },
  viewBtn: {
    height: 44, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 24px rgba(249,115,22,0.35)', transitionDuration: '160ms' } as any)
      : { shadowColor: PC.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }),
  },
  viewBtnText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13.5, letterSpacing: 0.1 },
  socialBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },

  skBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6 },

  /* Action Tooltips */
  customTooltip: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: '#1A0E04',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
    zIndex: 99999,
    minWidth: 40,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 8px 22px rgba(0,0,0,0.85), 0 0 0 1px rgba(251,146,60,0.18)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      userSelect: 'none',
    } as any) : {}),
  },
  tooltipTop: {
    bottom: '100%',
    marginBottom: 7,
  },
  tooltipBottom: {
    top: '100%',
    marginTop: 7,
  },
  customTooltipText: {
    color: '#FDBA74',
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
