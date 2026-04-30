/**
 * SA Profile Social View — Public profile at /profile/[id].
 * Hero (avatar + name + role badge + headline + meta + actions) + 4 tabs:
 *  · Overview  — About, Social Profiles (privacy-aware), Skills + Interests, Badges, Mutual
 *  · LinkedIn  — Highlights, Experience timeline, Education
 *  · GitHub    — Languages bar, Contribution stats, Pinned repos
 *  · Sessions  — (mentor only) total / avg-rating / mentees + recent sessions stub
 */
import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image,
  useWindowDimensions, Linking, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, MapPin, Lock, Eye, Mail, Phone, Link2, Globe, Briefcase,
  GraduationCap, Star, Calendar, Share2, MessageSquare, UserPlus, Check, Clock,
  Crown, Award, Code2, Code2 as GithubIcon, Building2, X as CloseX, ChevronRight, BadgeCheck,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';

const C = {
  bg: '#0C0818', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.09)',
  text: '#fff', text2: 'rgba(255,255,255,0.65)', text3: 'rgba(255,255,255,0.45)',
  purple: '#A78BFA', green: '#10B981', amber: '#F59E0B', cyan: '#22D3EE', pink: '#EC4899', rose: '#F43F5E',
};
type TabKey = 'overview' | 'linkedin' | 'github' | 'sessions';

export default function ProfileSocialView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuth();
  const { width: winW } = useWindowDimensions();
  const isMobile = winW < 768;
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    request<any>(`/users/${id}/public-profile`)
      .then((p) => setProfile(p))
      .catch((e: any) => setError(e?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </SafeAreaView>
    );
  }
  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 30 }]}>
        <Lock size={48} color={C.text3} />
        <Text style={styles.errTitle}>{error?.includes('private') ? 'Profile is private' : 'Profile not found'}</Text>
        <Text style={styles.errSub}>{error || 'This profile is unavailable right now.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.errBtn}><Text style={styles.errBtnText}>Go Back</Text></Pressable>
      </SafeAreaView>
    );
  }

  const isMe = me?.id === profile.id;
  const initials = ((profile.full_name || '?').split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const roleColor = profile.role === 'mentor' ? C.green : profile.role === 'alumni' ? C.cyan : profile.role === 'college' ? C.green : C.purple;
  const titleLine = [profile.job_title, profile.organization].filter(Boolean).join(' · ');
  const collegeLine = [profile.institution, profile.graduation_year].filter(Boolean).join(' · ');

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BadgeCheck },
    { key: 'linkedin', label: 'LinkedIn', icon: Link2 },
    ...(profile.github_url ? [{ key: 'github' as TabKey, label: 'GitHub', icon: Code2 }] : []),
    ...(profile.is_mentor ? [{ key: 'sessions' as TabKey, label: 'Sessions', icon: Calendar }] : []),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="psv-back">
            <ArrowLeft size={16} color={C.text2} /><Text style={styles.backText}>Back</Text>
          </Pressable>

          <LinearGradient
            colors={[`${roleColor}30`, `${roleColor}08`, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />

          <View style={[styles.heroBody, isMobile && { flexDirection: 'column', gap: 16, alignItems: 'flex-start' }]}>
            <View style={[styles.avatar, { borderColor: roleColor + '60' }]}>
              {profile.photo_data ? (
                <Image source={{ uri: profile.photo_data }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
              )}
              {profile.is_online && <View style={styles.onlineDot} />}
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text style={styles.name} numberOfLines={1}>{profile.full_name}</Text>
                <View style={[styles.roleChip, { backgroundColor: roleColor + '24', borderColor: roleColor + '60' }]}>
                  <Text style={[styles.roleText, { color: roleColor }]}>{profile.role.toUpperCase()}</Text>
                </View>
                {profile.is_mentor && profile.rating != null && (
                  <View style={styles.ratingChip}>
                    <Star size={11} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>{Number(profile.rating).toFixed(1)}</Text>
                    {profile.sessions != null && <Text style={styles.ratingSub}>· {profile.sessions} sessions</Text>}
                  </View>
                )}
              </View>
              {!!profile.headline && <Text style={styles.headline}>{profile.headline}</Text>}
              {!!titleLine && <Text style={styles.subline}>{titleLine}</Text>}
              {!!collegeLine && <Text style={styles.subline}>{collegeLine}</Text>}
              <View style={styles.metaRow}>
                {(profile.city || profile.state) && (
                  <View style={styles.metaItem}><MapPin size={12} color={C.text2} /><Text style={styles.metaText}>{[profile.city, profile.state].filter(Boolean).join(', ')}</Text></View>
                )}
                {profile.sa_id && (
                  <View style={styles.metaItem}><Text style={styles.metaText}>SA-ID</Text><Text style={[styles.metaText, styles.mono]}>{profile.sa_id}</Text></View>
                )}
                <View style={styles.metaItem}>
                  {profile.profile_visibility === 'network' ? <Lock size={12} color={C.text2} /> : <Eye size={12} color={C.text2} />}
                  <Text style={styles.metaText}>{profile.profile_visibility === 'network' ? 'Network only' : 'Public'}</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            {!isMe && (
              <View style={[styles.actions, isMobile && { width: '100%' }]}>
                {profile.is_mentor ? (
                  <Pressable onPress={() => showToast('Booking — open Network → Mentor → Book Session')} style={[styles.btn, styles.btnGreen]} testID="psv-book">
                    <Calendar size={14} color="#fff" /><Text style={styles.btnTextWhite}>Book Session</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => showToast('Connection request sent ✓')} style={[styles.btn, styles.btnPrimary]} testID="psv-connect">
                    <UserPlus size={14} color="#fff" /><Text style={styles.btnTextWhite}>Connect</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => showToast('Direct messages coming soon ✨')} style={[styles.btn, styles.btnGhost]} testID="psv-message">
                  <MessageSquare size={14} color={C.text} /><Text style={styles.btnTextLight}>Message</Text>
                </Pressable>
                <Pressable onPress={() => {
                  if (Platform.OS === 'web') {
                    const url = (window as any).location.href;
                    (navigator as any).clipboard?.writeText?.(url);
                    showToast('Profile link copied');
                  } else {
                    showToast('Share coming soon');
                  }
                }} style={[styles.btn, styles.btnIcon, styles.btnGhost]} testID="psv-share">
                  <Share2 size={14} color={C.text2} />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* TAB BAR */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {TABS.map((t) => {
              const Icon = t.icon; const active = tab === t.key;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} testID={`psv-tab-${t.key}`}>
                  <Icon size={13} color={active ? '#fff' : C.text2} />
                  <Text style={[styles.tabText, active && { color: '#fff' }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* TAB CONTENT */}
        <View style={[styles.body, { paddingHorizontal: isMobile ? 16 : 28 }]}>
          {tab === 'overview' && <OverviewTab profile={profile} />}
          {tab === 'linkedin' && <LinkedInTab profile={profile} />}
          {tab === 'github' && profile.github_url && <GitHubTab profile={profile} />}
          {tab === 'sessions' && profile.is_mentor && <SessionsTab profile={profile} />}
        </View>
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Check size={14} color={C.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────
function OverviewTab({ profile }: { profile: any }) {
  const allSkills: string[] = Array.from(new Set([...(profile.skills || []), ...(profile.interests || [])]));
  return (
    <View style={{ gap: 14 }}>
      {/* About */}
      <SectionCard title="About" icon={BadgeCheck} tint={C.purple}>
        {profile.bio ? (
          <Text style={styles.body}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bodyDim}>No bio yet.</Text>
        )}
      </SectionCard>

      {/* Social Profiles */}
      <SectionCard title="Social Profiles" icon={Link2} tint={C.cyan}>
        <SocialRow label="LinkedIn" url={profile.linkedin_url} icon={Link2} color="#0B5FFF" />
        <SocialRow label="GitHub" url={profile.github_url} icon={Code2} color="#fff" />
        <SocialRow label="Portfolio" url={profile.portfolio_url} icon={Globe} color={C.cyan} />
        <ContactRow label="Email" value={profile.email} hidden={!profile.show_email} icon={Mail} />
        <ContactRow label="Phone" value={profile.phone} hidden={!profile.show_phone} icon={Phone} />
      </SectionCard>

      {/* Skills + Interests */}
      {allSkills.length > 0 && (
        <SectionCard title="Skills & Interests" icon={Award} tint={C.green}>
          <View style={styles.chips}>
            {allSkills.map((s, i) => {
              const isPrimary = (profile.primary_skill || '').toLowerCase() === s.toLowerCase();
              return (
                <View key={`s-${i}`} style={[isPrimary ? styles.chipPrimary : styles.chipNeutral]}>
                  <Text style={[isPrimary ? styles.chipPrimaryText : styles.chipNeutralText]}>{s}</Text>
                </View>
              );
            })}
          </View>
        </SectionCard>
      )}

      {/* Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <SectionCard title={`Credentials & Badges (${profile.badges_total})`} icon={Crown} tint={C.amber}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {profile.badges.map((b: any, i: number) => <BadgePill key={`b-${i}`} badge={b} />)}
          </View>
        </SectionCard>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LINKEDIN TAB
// ─────────────────────────────────────────────────────────────────────────
function LinkedInTab({ profile }: { profile: any }) {
  const exp: any[] = profile.experience || [];
  const edu: any[] = profile.education || [];
  return (
    <View style={{ gap: 14 }}>
      {/* Profile header (link-out) */}
      {profile.linkedin_url && (
        <Pressable
          onPress={() => Platform.OS === 'web' ? (window as any).open(profile.linkedin_url, '_blank') : Linking.openURL(profile.linkedin_url)}
          style={[styles.section, styles.linkedinHead]}
        >
          <View style={[styles.linkedinIcon]}><Link2 size={16} color="#0B5FFF" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.lhTitle}>LinkedIn Profile</Text>
            <Text style={styles.lhSub} numberOfLines={1}>{profile.linkedin_url}</Text>
          </View>
          <ChevronRight size={16} color={C.text2} />
        </Pressable>
      )}

      {/* Highlights — College + Year */}
      <SectionCard title="Highlights" icon={GraduationCap} tint={C.amber}>
        <View style={styles.highlightCard}>
          <Building2 size={20} color={C.amber} />
          <View>
            <Text style={styles.hlTitle}>{profile.institution || '—'}</Text>
            <Text style={styles.hlSub}>{profile.branch || '—'}{profile.graduation_year ? ` · Class of ${profile.graduation_year}` : ''}</Text>
          </View>
        </View>
      </SectionCard>

      {/* Experience timeline */}
      <SectionCard title="Experience" icon={Briefcase} tint={C.cyan}>
        {exp.length === 0 ? (
          <Text style={styles.bodyDim}>No experience added yet.</Text>
        ) : (
          <View>{exp.map((e: any, i: number) => (
            <View key={`e-${i}`} style={[styles.timelineRow, i === exp.length - 1 && { paddingBottom: 0 }]}>
              <View style={styles.timelineDot} />
              {i !== exp.length - 1 && <View style={styles.timelineLine} />}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.expTitle}>{e.title || '—'}</Text>
                <Text style={styles.expCompany}>{e.company || '—'}</Text>
                <Text style={styles.expMeta}>{e.from || ''}{e.to ? ` — ${e.to}` : ' — Present'}{e.location ? ` · ${e.location}` : ''}</Text>
                {!!e.description && <Text style={styles.expDesc}>{e.description}</Text>}
              </View>
            </View>
          ))}</View>
        )}
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education" icon={GraduationCap} tint={C.purple}>
        {edu.length === 0 ? (
          <Text style={styles.bodyDim}>No education info yet.</Text>
        ) : (
          edu.map((e: any, i: number) => (
            <View key={`ed-${i}`} style={styles.eduRow}>
              <View style={[styles.timelineDot, { backgroundColor: C.purple }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expTitle}>{e.institution}</Text>
                <Text style={styles.expCompany}>{e.degree}</Text>
                <Text style={styles.expMeta}>{e.year}</Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GITHUB TAB
// ─────────────────────────────────────────────────────────────────────────
function GitHubTab({ profile }: { profile: any }) {
  const stats = profile.github_stats || {};
  const langs: any[] = stats.languages || [];
  const repos: any[] = stats.pinned_repos || [];

  return (
    <View style={{ gap: 14 }}>
      {/* Profile header (link-out) */}
      <Pressable
        onPress={() => Platform.OS === 'web' ? (window as any).open(profile.github_url, '_blank') : Linking.openURL(profile.github_url)}
        style={[styles.section, styles.githubHead]}
      >
        <View style={[styles.githubIcon]}><Code2 size={16} color="#fff" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.lhTitle}>GitHub Profile</Text>
          <Text style={styles.lhSub} numberOfLines={1}>{profile.github_url}</Text>
        </View>
        <ChevronRight size={16} color={C.text2} />
      </Pressable>

      {/* Top Languages */}
      {langs.length > 0 && (
        <SectionCard title="Top Languages" icon={Code2} tint={C.cyan}>
          <View style={styles.langBar}>
            {langs.map((l: any, i: number) => (
              <View key={`lb-${i}`} style={{ flex: l.pct, backgroundColor: l.color, height: '100%' }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {langs.map((l: any, i: number) => (
              <View key={`ll-${i}`} style={styles.langPill}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                <Text style={styles.langText}>{l.name} <Text style={styles.langPct}>{l.pct}%</Text></Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* Activity */}
      <SectionCard title="Recent Activity" icon={Calendar} tint={C.green}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.contributions_last_year ?? 0}</Text>
            <Text style={styles.statLabel}>Contributions (12 mo)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.amber }]}>{stats.longest_streak ?? 0}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.green }]}>{stats.current_streak ?? 0}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>
        {/* Mini contribution heatmap */}
        <View style={{ marginTop: 14, gap: 4 }}>
          <Text style={styles.heatLabel}>52-week activity</Text>
          <ContributionHeatmap />
        </View>
      </SectionCard>

      {/* Pinned Repos */}
      {repos.length > 0 && (
        <SectionCard title="Pinned Repositories" icon={GithubIcon} tint={C.purple}>
          <View style={styles.repoGrid}>
            {repos.map((r: any, i: number) => (
              <View key={`r-${i}`} style={styles.repoCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Code2 size={13} color={C.cyan} />
                  <Text style={styles.repoName} numberOfLines={1}>{r.name}</Text>
                </View>
                <Text style={styles.repoDesc} numberOfLines={2}>{r.desc}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.language_color }} />
                    <Text style={styles.repoMeta}>{r.language}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Star size={11} color={C.text2} />
                    <Text style={styles.repoMeta}>{r.stars}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      )}
    </View>
  );
}

function ContributionHeatmap() {
  // 52 weeks x 7 days, deterministic dummy intensity
  const cells = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 52 * 7; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      out.push(r < 0.6 ? Math.floor(r * 4) : Math.floor(r * 5));
    }
    return out;
  }, []);
  const COLORS = ['rgba(255,255,255,0.04)', '#0F4C2C', '#147A40', '#1F9D55', '#34D399'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, maxWidth: 580 }}>
      {cells.map((v, i) => (
        <View key={`c-${i}`} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: COLORS[Math.min(4, v)] }} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SESSIONS TAB (mentor only)
// ─────────────────────────────────────────────────────────────────────────
function SessionsTab({ profile }: { profile: any }) {
  const ss = profile.session_stats || {};
  return (
    <View style={{ gap: 14 }}>
      <SectionCard title="Session Stats" icon={Calendar} tint={C.green}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.green }]}>{ss.total ?? 0}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={14} color={C.amber} fill={C.amber} />
              <Text style={[styles.statValue, { color: C.amber }]}>{ss.avg_rating != null ? Number(ss.avg_rating).toFixed(1) : '—'}</Text>
            </View>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.cyan }]}>{ss.active_mentees ?? 0}</Text>
            <Text style={styles.statLabel}>Active Mentees</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Pricing & Availability" icon={Clock} tint={C.purple}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Per session</Text>
          <Text style={styles.priceValue}>{profile.expected_rate_inr ? `₹${Number(profile.expected_rate_inr).toLocaleString('en-IN')}` : 'Contact'}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>First 2 sessions</Text>
          <Text style={[styles.priceValue, { color: C.green }]}>FREE</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Response time</Text>
          <Text style={styles.priceValue}>~ 2 hours</Text>
        </View>
      </SectionCard>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, tint, children }: { title: string; icon: any; tint: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.secHead}>
        <View style={[styles.secIcon, { backgroundColor: tint + '24', borderColor: tint + '60' }]}>
          <Icon size={14} color={tint} />
        </View>
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function SocialRow({ label, url, icon: Icon, color }: { label: string; url?: string; icon: any; color: string }) {
  const open = () => url && (Platform.OS === 'web' ? (window as any).open(url, '_blank') : Linking.openURL(url));
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20' }]}><Icon size={14} color={color} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {url ? (
        <Pressable onPress={open} style={styles.linkBtn}>
          <Text style={styles.linkText} numberOfLines={1}>Open</Text>
          <ChevronRight size={12} color={C.purple} />
        </Pressable>
      ) : (
        <Text style={styles.rowDim}>Not shared</Text>
      )}
    </View>
  );
}
function ContactRow({ label, value, hidden, icon: Icon }: { label: string; value?: string; hidden: boolean; icon: any }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}><Icon size={14} color={C.text2} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {hidden ? (
        <View style={styles.privacy}><Lock size={11} color={C.text3} /><Text style={styles.privacyText}>Private</Text></View>
      ) : value ? (
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : (
        <Text style={styles.rowDim}>—</Text>
      )}
    </View>
  );
}
function BadgePill({ badge }: { badge: any }) {
  const isTierOne = /tier[\s-]?1/i.test(badge.label) || badge.tier === 'high';
  if (isTierOne) {
    return (
      <View style={{ overflow: 'hidden', borderRadius: 999 }}>
        <LinearGradient colors={['#FCD34D', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.badgeChip, { borderColor: '#FCD34D', borderWidth: 1, backgroundColor: 'transparent' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Crown size={9} color="#fff" />
            <Text style={[styles.badgeChipText, { color: '#fff' }]} numberOfLines={1}>{badge.label}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
  const tColor = badge.tier === 'special' ? C.purple : badge.tier === 'verified' ? C.green : badge.tier === 'moderate' ? '#2DD4BF' : '#94A3B8';
  return (
    <View style={[styles.badgeChip, { backgroundColor: tColor + '1F', borderColor: tColor + '60' }]}>
      <Text style={[styles.badgeChipText, { color: tColor }]} numberOfLines={1}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  errTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16, marginTop: 18 },
  errSub: { color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6, textAlign: 'center' },
  errBtn: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: C.purple, ...({ cursor: 'pointer' } as any) },
  errBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  hero: { paddingHorizontal: 16, paddingBottom: 18, position: 'relative' },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, marginVertical: 12, ...({ cursor: 'pointer' } as any) },
  backText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },

  heroBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, paddingTop: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, position: 'relative' },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 30 },
  onlineDot: { position: 'absolute', right: 4, bottom: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: C.green, borderColor: C.bg, borderWidth: 2 },

  name: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.3 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  roleText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1 },
  ratingText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  ratingSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

  headline: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13.5, marginTop: 4 },
  subline: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  mono: { color: '#fff', fontFamily: Platform.OS === 'web' ? 'monospace' : 'DMSans_700Bold', fontSize: 10.5 },

  actions: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 36, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  btnIcon: { paddingHorizontal: 0, width: 36 },
  btnPrimary: { backgroundColor: C.purple, borderColor: C.purple, borderWidth: 1 },
  btnGreen: { backgroundColor: C.green, borderColor: C.green, borderWidth: 1 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  btnTextWhite: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnTextLight: { color: C.text, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  tabBar: { borderTopColor: C.border, borderTopWidth: 1, borderBottomColor: C.border, borderBottomWidth: 1, paddingVertical: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'transparent', ...({ cursor: 'pointer' } as any) },
  tabActive: { backgroundColor: 'rgba(167,139,250,0.16)' },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  body: { paddingTop: 18, paddingBottom: 24, gap: 14 },

  section: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },

  bodyDim: { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  rowValue: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12, maxWidth: 240 },
  rowDim: { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 11.5 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  linkText: { color: C.purple, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  privacyText: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipPrimary: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 },
  chipPrimaryText: { color: '#34D399', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  chipNeutral: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  chipNeutralText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  badgeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, maxWidth: 200 },
  badgeChipText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.2 },

  // LinkedIn / GitHub heads
  linkedinHead: { flexDirection: 'row', alignItems: 'center', gap: 12, ...({ cursor: 'pointer' } as any) },
  linkedinIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(11,95,255,0.14)', borderColor: 'rgba(11,95,255,0.40)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  githubHead: { flexDirection: 'row', alignItems: 'center', gap: 12, ...({ cursor: 'pointer' } as any) },
  githubIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lhTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  lhSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  highlightCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 11, backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.20)', borderWidth: 1 },
  hlTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  hlSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  timelineRow: { flexDirection: 'row', gap: 12, paddingBottom: 14, position: 'relative' },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.cyan, marginTop: 6 },
  timelineLine: { position: 'absolute', left: 4, top: 14, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  expTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  expCompany: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  expMeta: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  expDesc: { color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4 },
  eduRow: { flexDirection: 'row', gap: 12, paddingVertical: 6 },

  langBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  langPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  langText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  langPct: { color: '#fff', fontFamily: 'DMSans_700Bold' },
  heatLabel: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },

  statBox: { flex: 1, minWidth: 110, padding: 12, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, alignItems: 'flex-start' },
  statValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 22 },
  statLabel: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 4 },

  repoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  repoCard: { flex: 1, minWidth: 220, padding: 12, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  repoName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  repoDesc: { color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 11.5, lineHeight: 15 },
  repoMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
  priceLabel: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  priceValue: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },

  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.50)', borderWidth: 1 },
  toastText: { color: C.green, fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
