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
  View, Text, ScrollView, ActivityIndicator, Pressable, Image,
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
import { request, api } from '@/src/models/services/api';
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
  const [isPending, setIsPending] = useState(false);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    
    // Intercept mock accounts from Alumni cards
    if (id.startsWith('m') && !isNaN(Number(id.substring(1)))) {
      const mockProfiles: Record<string, any> = {
        'm1': { id: 'm1', full_name: 'Arjun Mehta', role: 'alumni', headline: 'Software Engineer II at Google', city: 'Bangalore', institution: 'Nexus University', graduation_year: 2018, skills: ['React', 'Node.js', 'System Design'], show_email: true, email: 'arjun@example.com', github_url: 'https://github.com', linkedin_url: 'https://linkedin.com' },
        'm2': { id: 'm2', full_name: 'Priya Sharma', role: 'alumni', headline: 'Product Manager at Microsoft', city: 'Hyderabad', institution: 'Nexus University', graduation_year: 2015, skills: ['Agile', 'Product Strategy', 'UX'], show_email: false, linkedin_url: 'https://linkedin.com' },
        'm3': { id: 'm3', full_name: 'Rahul Desai', role: 'alumni', headline: 'Data Scientist at Amazon', city: 'Seattle, WA', institution: 'Nexus University', graduation_year: 2021, skills: ['Python', 'Machine Learning', 'SQL'], show_email: true, email: 'rahul@example.com', github_url: 'https://github.com', linkedin_url: 'https://linkedin.com' },
        'm4': { id: 'm4', full_name: 'Neha Gupta', role: 'alumni', headline: 'UX Designer at Airbnb', city: 'San Francisco, CA', institution: 'Nexus University', graduation_year: 2019, skills: ['Figma', 'User Research', 'Prototyping'], show_email: false, linkedin_url: 'https://linkedin.com' },
        'm5': { id: 'm5', full_name: 'Vikram Singh', role: 'alumni', headline: 'Engineering Manager at Netflix', city: 'Los Gatos, CA', institution: 'Nexus University', graduation_year: 2012, skills: ['Leadership', 'Distributed Systems', 'Java'], show_email: true, email: 'vikram@example.com', github_url: 'https://github.com', linkedin_url: 'https://linkedin.com' },
        'm6': { id: 'm6', full_name: 'Ananya Patel', role: 'alumni', headline: 'Frontend Developer at Stripe', city: 'Remote', institution: 'Nexus University', graduation_year: 2023, skills: ['Vue.js', 'TypeScript', 'CSS'], show_email: true, email: 'ananya@example.com', github_url: 'https://github.com', linkedin_url: 'https://linkedin.com' },
      };
      if (mockProfiles[id]) {
        setTimeout(() => {
          setProfile(mockProfiles[id]);
          setLoading(false);
        }, 500);
        return;
      }
    }

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
        <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16, marginTop: 18  }}>{error?.includes('private') ? 'Profile is private' : 'Profile not found'}</Text>
        <Text className="text-center" style={{  color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6  }}>{error || 'This profile is unavailable right now.'}</Text>
        <Pressable onPress={() => router.back()} className="px-4 py-2.5 rounded-lg" style={{  marginTop: 18, backgroundColor: C.purple, ...({ cursor: 'pointer' } as any)  }}><Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12  }}>Go Back</Text></Pressable>
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
    <SafeAreaView style={[styles.screen, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <Pressable 
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 8, 24, 0.7)' }, Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } as any : {}]}
        onPress={() => router.back()}
      />
      <View style={{  flex: 1, alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 40  }} pointerEvents="box-none">
        <View style={{ 
          width: '100%', 
          maxWidth: 960, 
          height: isMobile ? '100%' : '94%', 
          backgroundColor: C.bg, 
          borderRadius: isMobile ? 0 : 20, 
          overflow: 'hidden',
          borderColor: C.border,
          borderWidth: isMobile ? 0 : 1,
          ...(Platform.OS === 'web' && !isMobile ? { boxShadow: '0 10px 40px rgba(0,0,0,0.5)' } as any : {})
        }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View className="px-4 relative" style={{  paddingBottom: 18  }}>
          <Pressable onPress={() => router.back()} className="z-[10] flex-row items-center gap-2 px-2.5 py-2 rounded-lg" style={{  alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, marginVertical: 12, ...({ cursor: 'pointer' } as any)  }} testID="psv-back">
            <ArrowLeft size={16} color={C.text2} /><Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 16  }}>Back</Text>
          </Pressable>

          <LinearGradient
            colors={[`${roleColor}30`, `${roleColor}08`, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            pointerEvents="none"
            className="absolute" style={{  top: 0, left: 0, right: 0, height: 240  }}
          />

          <View style={[styles.heroBody, isMobile && { flexDirection: 'column', gap: 16, alignItems: 'flex-start' }]}>
            <View style={{  position: 'relative'  }}>
              <View style={[styles.avatar, { borderColor: roleColor + '60' }]}>
                {profile.photo_data ? (
                  <Image source={{ uri: profile.photo_data }} style={{  width: '100%', height: '100%'  }} />
                ) : (
                  <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
                )}
              </View>
              {profile.is_online && <View className="absolute rounded-md border-2 z-[3]" style={{  right: 6, bottom: 6, width: 14, height: 14, backgroundColor: C.green, borderColor: C.bg  }} />}
              {profile.is_verified && (
                <View className="absolute rounded-xl items-center justify-center border-2 z-[3]" style={{  right: 3, bottom: 3, width: 20, height: 20, backgroundColor: C.green, borderColor: C.bg  }}>
                  <Check size={11} color="#fff" />
                </View>
              )}
            </View>

            <View style={{  flex: 1, minWidth: 0, gap: 6  }}>
              <View style={{  flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8  }}>
                <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.3  }} numberOfLines={1}>{profile.full_name}</Text>
                <View style={[styles.roleChip, { backgroundColor: roleColor + '24', borderColor: roleColor + '60' }]}>
                  <Text style={[styles.roleText, { color: roleColor }]}>{profile.role.toUpperCase()}</Text>
                </View>
                {profile.is_mentor && profile.rating != null && (
                  <View className="flex-row items-center gap-1 rounded-full" style={{  paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1  }}>
                    <Star size={11} color="#F59E0B" fill="#F59E0B" />
                    <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11  }}>{Number(profile.rating).toFixed(1)}</Text>
                    {profile.sessions != null && <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5  }}>· {profile.sessions} sessions</Text>}
                  </View>
                )}
              </View>
              {!!profile.headline && <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13.5, marginTop: 4  }}>{profile.headline}</Text>}
              {!!titleLine && <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12  }}>{titleLine}</Text>}
              {!!collegeLine && <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12  }}>{collegeLine}</Text>}
              <View className="flex-row flex-wrap gap-3" style={{  marginTop: 6  }}>
                {(profile.city || profile.state) && (
                  <View className="flex-row items-center" style={{  gap: 5  }}><MapPin size={12} color={C.text2} /><Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 14  }}>{[profile.city, profile.state].filter(Boolean).join(', ')}</Text></View>
                )}
                {profile.sa_id && (
                  <View className="flex-row items-center" style={{  gap: 5  }}><Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 14  }}>SA-ID</Text><Text style={[styles.metaText, styles.mono]}>{profile.sa_id}</Text></View>
                )}
                <View className="flex-row items-center" style={{  gap: 5  }}>
                  {profile.profile_visibility === 'network' ? <Lock size={12} color={C.text2} /> : <Eye size={12} color={C.text2} />}
                  <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 14  }}>{profile.profile_visibility === 'network' ? 'Network only' : 'Public'}</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            {!isMe && (
              <View style={[styles.actions, isMobile && { width: '100%' }]}>
                {profile.is_mentor ? (
                  <Pressable onPress={() => showToast('Booking — open Network → Mentor → Book Session')} style={[styles.btn, styles.btnGreen]} testID="psv-book">
                    <Calendar size={14} color="#fff" /><Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12  }}>Book Session</Text>
                  </Pressable>
                ) : (
                  profile.connection_state === 'connected' ? (
                    <View style={[styles.btn, { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 }]} testID="psv-connected">
                      <Check size={14} color="#10B981" />
                      <Text style={[styles.btnTextWhite, { color: '#10B981' }]}>Connected</Text>
                    </View>
                  ) : profile.connection_state === 'pending' ? (
                    <View style={[styles.btn, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.40)', borderWidth: 1 }]} testID="psv-pending">
                      <Clock size={14} color="#F59E0B" />
                      <Text style={[styles.btnTextWhite, { color: '#F59E0B' }]}>Pending</Text>
                    </View>
                  ) : profile.connection_state === 'incoming' ? (
                    <Pressable
                      onPress={async () => {
                        try {
                          await api.acceptConnection(profile.id);
                          showToast('Connected!');
                          setProfile((p: any) => p ? { ...p, connection_state: 'connected' } : null);
                        } catch {
                          showToast('Failed to accept');
                        }
                      }}
                      style={[styles.btn, styles.btnPrimary]}
                      testID="psv-accept"
                    >
                      <Check size={14} color="#fff" />
                      <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12  }}>Accept Connection</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={async () => {
                        // Optimistically set to pending
                        setProfile((p: any) => p ? { ...p, connection_state: 'pending' } : null);
                        try {
                          const r = await api.sendConnectionRequest(profile.id);
                          if (r?.action === 'auto_accepted') {
                            setProfile((p: any) => p ? { ...p, connection_state: 'connected' } : null);
                            showToast('Connected!');
                          } else {
                            showToast('Request sent ✓');
                          }
                        } catch {
                          setProfile((p: any) => p ? { ...p, connection_state: 'none' } : null);
                          showToast('Failed to connect');
                        }
                      }}
                      style={[styles.btn, styles.btnPrimary]}
                      testID="psv-connect"
                    >
                      <UserPlus size={14} color="#fff" />
                      <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12  }}>Connect</Text>
                    </Pressable>
                  )
                )}
                <Pressable onPress={() => showToast('Direct messages coming soon ✨')} style={[styles.btn, styles.btnGhost]} testID="psv-message">
                  <MessageSquare size={14} color={C.text} /><Text className="" style={{  color: C.text, fontFamily: 'DMSans_700Bold', fontSize: 12  }}>Message</Text>
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
        <View className="py-2" style={{  borderTopColor: C.border, borderTopWidth: 1, borderBottomColor: C.border, borderBottomWidth: 1  }}>
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
        <View className="absolute flex-row items-center gap-2 px-3.5 rounded-xl" style={{  bottom: 30, alignSelf: 'center', paddingVertical: 9, backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.50)', borderWidth: 1  }}>
          <Check size={14} color={C.green} />
          <Text className="" style={{  color: C.green, fontFamily: 'DMSans_700Bold', fontSize: 12  }}>{toast}</Text>
        </View>
      )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────
function OverviewTab({ profile }: { profile: any }) {
  const allSkills: string[] = Array.from(new Set([...(profile.skills || []), ...(profile.interests || [])]));
  return (
    <View style={{  gap: 14  }}>
      {/* About */}
      <SectionCard title="About" icon={BadgeCheck} tint={C.purple}>
        {profile.bio ? (
          <Text className="pb-6 gap-3.5" style={{  paddingTop: 18  }}>{profile.bio}</Text>
        ) : (
          <Text className="" style={{  color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 12  }}>No bio yet.</Text>
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
          <View className="flex-row flex-wrap gap-1.5">
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
          <View style={{  flexDirection: 'row', flexWrap: 'wrap', gap: 6  }}>
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
    <View style={{  gap: 14  }}>
      {/* Profile header (link-out) */}
      {profile.linkedin_url && (
        <Pressable
          onPress={() => Platform.OS === 'web' ? (window as any).open(profile.linkedin_url, '_blank') : Linking.openURL(profile.linkedin_url)}
          style={[styles.section, styles.linkedinHead]}
        >
          <View style={[styles.linkedinIcon]}><Link2 size={16} color="#0B5FFF" /></View>
          <View style={{  flex: 1, minWidth: 0  }}>
            <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13  }}>LinkedIn Profile</Text>
            <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2  }} numberOfLines={1}>{profile.linkedin_url}</Text>
          </View>
          <ChevronRight size={16} color={C.text2} />
        </Pressable>
      )}

      {/* Highlights — College + Year */}
      <SectionCard title="Highlights" icon={GraduationCap} tint={C.amber}>
        <View className="flex-row items-center gap-3.5 p-3 rounded-xl" style={{  backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.20)', borderWidth: 1  }}>
          <Building2 size={20} color={C.amber} />
          <View>
            <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13  }}>{profile.institution || '—'}</Text>
            <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2  }}>{profile.branch || '—'}{profile.graduation_year ? ` · Class of ${profile.graduation_year}` : ''}</Text>
          </View>
        </View>
      </SectionCard>

      {/* Experience timeline */}
      <SectionCard title="Experience" icon={Briefcase} tint={C.cyan}>
        {exp.length === 0 ? (
          <Text className="" style={{  color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 12  }}>No experience added yet.</Text>
        ) : (
          <View>{exp.map((e: any, i: number) => (
            <View key={`e-${i}`} style={[styles.timelineRow, i === exp.length - 1 && { paddingBottom: 0 }]}>
              <View className="" style={{  width: 9, height: 9, borderRadius: 5, backgroundColor: C.cyan, marginTop: 6  }} />
              {i !== exp.length - 1 && <View className="absolute" style={{  left: 4, top: 14, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)'  }} />}
              <View style={{  flex: 1, gap: 3  }}>
                <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13  }}>{e.title || '—'}</Text>
                <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12  }}>{e.company || '—'}</Text>
                <Text className="" style={{  color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11  }}>{e.from || ''}{e.to ? ` — ${e.to}` : ' — Present'}{e.location ? ` · ${e.location}` : ''}</Text>
                {!!e.description && <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4  }}>{e.description}</Text>}
              </View>
            </View>
          ))}</View>
        )}
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education" icon={GraduationCap} tint={C.purple}>
        {edu.length === 0 ? (
          <Text className="" style={{  color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 12  }}>No education info yet.</Text>
        ) : (
          edu.map((e: any, i: number) => (
            <View key={`ed-${i}`} className="flex-row gap-3" style={{  paddingVertical: 6  }}>
              <View style={[styles.timelineDot, { backgroundColor: C.purple }]} />
              <View style={{  flex: 1  }}>
                <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13  }}>{e.institution}</Text>
                <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12  }}>{e.degree}</Text>
                <Text className="" style={{  color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11  }}>{e.year}</Text>
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
    <View style={{  gap: 14  }}>
      {/* Profile header (link-out) */}
      <Pressable
        onPress={() => Platform.OS === 'web' ? (window as any).open(profile.github_url, '_blank') : Linking.openURL(profile.github_url)}
        style={[styles.section, styles.githubHead]}
      >
        <View style={[styles.githubIcon]}><Code2 size={16} color="#fff" /></View>
        <View style={{  flex: 1, minWidth: 0  }}>
          <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13  }}>GitHub Profile</Text>
          <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2  }} numberOfLines={1}>{profile.github_url}</Text>
        </View>
        <ChevronRight size={16} color={C.text2} />
      </Pressable>

      {/* Top Languages */}
      {langs.length > 0 && (
        <SectionCard title="Top Languages" icon={Code2} tint={C.cyan}>
          <View className="flex-row overflow-hidden" style={{  height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)'  }}>
            {langs.map((l: any, i: number) => (
              <View key={`lb-${i}`} style={{  flex: l.pct, backgroundColor: l.color, height: '100%'  }} />
            ))}
          </View>
          <View style={{  flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10  }}>
            {langs.map((l: any, i: number) => (
              <View key={`ll-${i}`} className="flex-row items-center px-2 rounded-full" style={{  gap: 5, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1  }}>
                <View style={{  width: 8, height: 8, borderRadius: 4, backgroundColor: l.color  }} />
                <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11  }}>{l.name} <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold'  }}>{l.pct}%</Text></Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* Activity */}
      <SectionCard title="Recent Activity" icon={Calendar} tint={C.green}>
        <View style={{  flexDirection: 'row', gap: 12, flexWrap: 'wrap'  }}>
          <View className="flex-1 p-3 rounded-xl" style={{  minWidth: 110, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, alignItems: 'flex-start'  }}>
            <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 22  }}>{stats.contributions_last_year ?? 0}</Text>
            <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 4  }}>Contributions (12 mo)</Text>
          </View>
          <View className="flex-1 p-3 rounded-xl" style={{  minWidth: 110, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, alignItems: 'flex-start'  }}>
            <Text style={[styles.statValue, { color: C.amber }]}>{stats.longest_streak ?? 0}</Text>
            <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 4  }}>Longest Streak</Text>
          </View>
          <View className="flex-1 p-3 rounded-xl" style={{  minWidth: 110, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, alignItems: 'flex-start'  }}>
            <Text style={[styles.statValue, { color: C.green }]}>{stats.current_streak ?? 0}</Text>
            <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 4  }}>Current Streak</Text>
          </View>
        </View>
        {/* Mini contribution heatmap */}
        <View style={{  marginTop: 14, gap: 4  }}>
          <Text className="uppercase" style={{  color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.4  }}>52-week activity</Text>
          <ContributionHeatmap />
        </View>
      </SectionCard>

      {/* Pinned Repos */}
      {repos.length > 0 && (
        <SectionCard title="Pinned Repositories" icon={GithubIcon} tint={C.purple}>
          <View className="flex-row flex-wrap gap-2.5">
            {repos.map((r: any, i: number) => (
              <View key={`r-${i}`} className="flex-1 p-3 rounded-xl" style={{  minWidth: 220, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1  }}>
                <View style={{  flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6  }}>
                  <Code2 size={13} color={C.cyan} />
                  <Text className="" style={{  color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5  }} numberOfLines={1}>{r.name}</Text>
                </View>
                <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 11.5, lineHeight: 15  }} numberOfLines={2}>{r.desc}</Text>
                <View style={{  flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8  }}>
                  <View style={{  flexDirection: 'row', alignItems: 'center', gap: 4  }}>
                    <View style={{  width: 8, height: 8, borderRadius: 4, backgroundColor: r.language_color  }} />
                    <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5  }}>{r.language}</Text>
                  </View>
                  <View style={{  flexDirection: 'row', alignItems: 'center', gap: 3  }}>
                    <Star size={11} color={C.text2} />
                    <Text className="" style={{  color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5  }}>{r.stars}</Text>
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
    <View style={{  flexDirection: 'row', flexWrap: 'wrap', gap: 2, maxWidth: 580  }}>
      {cells.map((v, i) => (
        <View key={`c-${i}`} sRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 14 },
  mono: { color: '#fff', fontFamily: Platform.OS === 'web' ? 'monospace' : 'DMSans_700Bold', fontSize: 10.5 },

  actions: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 36, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  btnIcon: { paddingHorizontal: 0, width: 36, justifyContent: 'center' },
  btnPrimary: { backgroundColor: C.purple, borderColor: C.purple, borderWidth: 1 },
  btnGreen: { backgroundColor: C.green, borderColor: C.green, borderWidth: 1 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  btnTextWhite: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnTextLight: { color: C.text, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  tabBar: { borderTopColor: C.border, borderTopWidth: 1, borderBottomColor: C.border, borderBottomWidth: 1, paddingVertical: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'transparent', ...({ cursor: 'pointer' } as any) },
  tabActive: { backgroundColor: 'rgba(167,139,250,0.16)' },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12, lineHeight: 16 },

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
