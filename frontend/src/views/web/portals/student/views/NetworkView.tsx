// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  UserPlus, 
  Check, 
  MessageSquare, 
  Star, 
  Clock, 
  Calendar, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Linkedin, 
  Github, 
  Eye, 
  Plus, 
  X 
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { request } from '@/src/models/services/api';

import { StudentPortalNavContext } from '../StudentPortalRN';

type CategoryTab = 'discover' | 'connections' | 'book';

export function NetworkView() {
  const toast = useToast();
  const router = useRouter();
  const authUser = useAuthStore((sx) => sx.user);
  
  const [activeTab, setActiveTab] = useState<CategoryTab>('discover');
  const [q, setQ] = useState('');
  
  // Dynamic action collections
  const [conn, setConn] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  // Modal profile viewer state
  const [pickedPerson, setPickedPerson] = useState<any | null>(null);

  // Limits for Discover tab lists
  const [mentorLimit, setMentorLimit] = useState(3);
  const [alumniLimit, setAlumniLimit] = useState(3);
  const [studentLimit, setStudentLimit] = useState(3);

  // Fetch student network dataset
  const path = authUser?.email
    ? `/student/network?student_email=${encodeURIComponent(authUser.email)}`
    : '/student/network';
  
  const { data, loading, refresh } = usePortalData<any>(path, { items: [] }, 60_000);
  const rawPeople = data?.items || [];

  const sumChars = (str: string) => {
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  // Normalize fetched profiles to standard frontend card representation
  const normalizedPeople = useMemo(() => {
    return rawPeople.map((p: any) => {
      const kind = p.kind || 'student';
      const name = p.name || 'Anonymous';
      const initials = p.initials || (name.split(' ').slice(0, 2).map((part: string) => part[0] || '').join('').toUpperCase());
      const color = p.color || '#8B5CF6';
      
      let tag = 'Student';
      if (kind === 'alumni') tag = 'Alumni';
      else if (kind === 'mentor') tag = 'Mentor';
      
      const company = p.company || p.college || '';
      const role = p.subline || p.role || '';
      
      const rating = p.rating || 5.0;
      const sessions = p.sessions || 0;
      // deterministic mock session pricing (free / paid)
      const price = (sumChars(p.id || '') % 3) === 0 ? 'Free' : `₹${500 + (sumChars(p.id || '') % 5) * 250}`;

      let photo = p.photo_data || p.face_image_base64 || p.photo || '';
      if (photo && !photo.startsWith('data:') && !photo.startsWith('http')) {
        photo = `data:image/jpeg;base64,${photo}`;
      }

      return {
        id: p.id,
        name,
        initials,
        color,
        tag,
        role: role,
        company: company,
        college: p.college || '',
        batch: p.batch || 2026,
        tags: p.tags ? p.tags.filter((t: string) => t !== 'Mentor' && t !== 'Alumni' && t !== 'Student') : [],
        mutual: p.mutual || ((sumChars(p.id || '') % 18) + 4),
        linkedin: p.linkedin || 'linkedin.com',
        github: p.github || 'github.com',
        connectionState: p.connection_state || 'none',
        kind,
        rating,
        sessions,
        price,
        photo
      };
    });
  }, [rawPeople]);

  // Synchronise search queries from global portal context
  const portalNav = React.useContext(StudentPortalNavContext);
  React.useEffect(() => {
    if (portalNav?.searchQuery) {
      setQ(portalNav.searchQuery);
      portalNav.setSearchQuery('');
    }
  }, [portalNav?.searchQuery]);

  // Filter list by search query
  const filteredList = useMemo(() => {
    return normalizedPeople.filter((p) => {
      if (!q) return true;
      const matchText = `${p.name} ${p.role} ${p.company} ${p.college} ${p.tags.join(' ')}`.toLowerCase();
      return matchText.includes(q.toLowerCase());
    });
  }, [normalizedPeople, q]);

  // Partition data for the Discover Tab
  const mentorsList = useMemo(() => filteredList.filter(p => p.kind === 'mentor'), [filteredList]);
  const alumniList = useMemo(() => filteredList.filter(p => p.kind === 'alumni'), [filteredList]);
  const studentsList = useMemo(() => filteredList.filter(p => p.kind === 'student'), [filteredList]);

  const visibleMentors = useMemo(() => mentorsList.slice(0, mentorLimit), [mentorsList, mentorLimit]);
  const visibleAlumni = useMemo(() => alumniList.slice(0, alumniLimit), [alumniList, alumniLimit]);
  const visibleStudents = useMemo(() => studentsList.slice(0, studentLimit), [studentsList, studentLimit]);

  // Connections Tab: Accepted relationships
  const connectionsList = useMemo(() => {
    return filteredList.filter(p => p.connectionState === 'connected' || conn.has(p.id));
  }, [filteredList, conn]);

  // Connection invitations sender
  const handleConnect = async (id: string, name: string) => {
    setPending((p) => new Set(p).add(id));
    try {
      await request(`/network/connect/${id}`, { method: 'POST' });
      toast.success('Connection Sent! ✉️', `Your connection invite to ${name} has been sent.`);
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
      // update state locally
      setConn((c) => new Set(c).add(id));
    } catch (err: any) {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
      toast.error('Could not connect', err?.message || 'Please try again.');
    }
  };

  const viewMentor = (m: any) => {
    router.push({
      pathname: `/mentor/${m.id}`,
      params: {
        id: m.id,
        name: m.name,
        title: m.role,
        bio: 'Experienced professional ready to share industry insights, career strategies, and guidance.',
        avatar: m.photo || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200`,
        rating: String(m.rating),
        sessions: String(m.sessions),
        tags: m.tags?.join(','),
      }
    });
  };

  if (loading) {
    return (
      <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={SC.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      
      {/* Tab Selector row */}
      <View style={s.tabRow}>
        <Pressable 
          onPress={() => setActiveTab('discover')} 
          style={[s.tabBtn, activeTab === 'discover' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'discover' && s.tabBtnTextActive]}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('connections')} 
          style={[s.tabBtn, activeTab === 'connections' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'connections' && s.tabBtnTextActive]}>My Connections</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('book')} 
          style={[s.tabBtn, activeTab === 'book' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'book' && s.tabBtnTextActive]}>Book a Mentor</Text>
        </Pressable>
      </View>

      {/* Global Search bar */}
      <View style={s.searchContainer}>
        <Search size={16} color={SC.dim} style={{ marginRight: 8 }} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name, role, skill or company..."
          placeholderTextColor={SC.dim}
          style={s.searchInput}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} style={{ padding: 4 }}>
            <X size={14} color={SC.dim} />
          </Pressable>
        ) : null}
      </View>

      {/* Discover tab screen */}
      {activeTab === 'discover' && (
        <View style={{ gap: 24 }}>
          
          {/* Section 1: Recommended Mentors */}
          {mentorsList.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeaderRow}>
                <View style={[s.secIconBg, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Briefcase size={14} color="#86EFAC" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>Recommended Mentors</Text>
                    <View style={s.secBadge}><Text style={s.secBadgeText}>{mentorsList.length}</Text></View>
                  </View>
                  <Text style={s.secSub}>Based on your career path and interests</Text>
                </View>
              </View>

              <View style={s.grid}>
                {visibleMentors.map((m) => (
                  <GlassCard key={m.id} radius={14} padding={16} style={s.card}>
                    <View>
                      <View style={s.cardHead}>
                        <Av initials={m.initials} size={46} color={m.color} photo={m.photo} />
                        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text numberOfLines={1} style={s.cardName}>{m.name}</Text>
                            <View style={s.badgeMentor}><Text style={s.badgeMentorText}>MENTOR</Text></View>
                          </View>
                          <Text numberOfLines={1} style={s.cardRole}>{m.role}</Text>
                          <Text numberOfLines={1} style={s.cardCompany}>{m.company}</Text>
                        </View>
                      </View>

                      <View style={s.tagsRow}>
                        {m.tags.slice(0, 3).map((tag, idx) => (
                          <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                        ))}
                      </View>

                      <View style={s.statsRow}>
                        <View style={s.statItem}>
                          <Star size={11} color={SC.amber} fill={SC.amber} />
                          <Text style={s.statText}>{m.rating}</Text>
                        </View>
                        <View style={s.statItem}>
                          <Clock size={11} color={SC.muted} />
                          <Text style={s.statText}>{m.sessions} sessions</Text>
                        </View>
                        <Text style={s.priceText}>{m.price}/session</Text>
                      </View>

                      <View style={s.mutualRow}>
                        <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                        <Text style={s.mutualText}>{m.mutual} mutual connections</Text>
                      </View>
                    </View>

                    <View style={s.cardActions}>
                      <Pressable onPress={() => viewMentor(m)} style={s.actionBtnOutline}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnOutlineText}>View Profile</Text>
                      </Pressable>

                      <Pressable onPress={() => viewMentor(m)} style={s.actionBtnFill}>
                        <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnFillText}>Book</Text>
                      </Pressable>

                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable onPress={() => Linking.openURL(`https://${m.linkedin}`)} style={s.iconBtn}>
                          <Linkedin size={12} color={SC.muted} />
                        </Pressable>
                        {m.github && (
                          <Pressable onPress={() => Linking.openURL(`https://${m.github}`)} style={s.iconBtn}>
                            <Github size={12} color={SC.muted} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
              {mentorsList.length > 3 && (
                <View style={s.viewMoreContainer}>
                  {mentorLimit < mentorsList.length ? (
                    <Pressable 
                      onPress={() => setMentorLimit(prev => Math.min(prev + 3, mentorsList.length))} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Load More</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={() => setMentorLimit(3)} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Show Less</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Section 2: Matched by Interest */}
          {alumniList.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeaderRow}>
                <View style={[s.secIconBg, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Users size={14} color={SC.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>Matched by Interest</Text>
                    <View style={s.secBadge}><Text style={s.secBadgeText}>{alumniList.length}</Text></View>
                  </View>
                  <Text style={s.secSub}>Alumni who share your skills and goals</Text>
                </View>
              </View>

              <View style={s.grid}>
                {visibleAlumni.map((al) => {
                  const isPending = pending.has(al.id) || al.connectionState === 'pending';
                  const isConnected = conn.has(al.id) || al.connectionState === 'connected';

                  return (
                    <GlassCard key={al.id} radius={14} padding={16} style={s.card}>
                      <View>
                        <View style={s.cardHead}>
                          <Av initials={al.initials} size={46} color={al.color} photo={al.photo} />
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text numberOfLines={1} style={s.cardName}>{al.name}</Text>
                              <View style={s.badgeAlumni}><Text style={s.badgeAlumniText}>Alumni</Text></View>
                            </View>
                            <Text numberOfLines={1} style={s.cardRole}>{al.role}</Text>
                            <Text numberOfLines={1} style={s.cardCompany}>{al.company}</Text>
                          </View>
                        </View>

                        <View style={s.tagsRow}>
                          {al.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                          ))}
                        </View>

                        <View style={s.mutualRow}>
                          <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                          <Text style={s.mutualText}>{al.mutual} mutual connections</Text>
                        </View>
                      </View>

                      <View style={s.cardActions}>
                        <Pressable onPress={() => setPickedPerson(al)} style={s.actionBtnOutline}>
                          <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                          <Text style={s.actionBtnOutlineText}>View Profile</Text>
                        </Pressable>

                        {isConnected ? (
                          <View style={s.connectedBadge}>
                            <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                            <Text style={s.connectedText}>Connected</Text>
                          </View>
                        ) : isPending ? (
                          <View style={s.pendingBadge}>
                            <Clock size={11} color={SC.amber} style={{ marginRight: 4 }} />
                            <Text style={s.pendingText}>Pending</Text>
                          </View>
                        ) : (
                          <Pressable onPress={() => handleConnect(al.id, al.name)} style={s.actionBtnOutline}>
                            <UserPlus size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                            <Text style={s.actionBtnOutlineText}>Connect</Text>
                          </Pressable>
                        )}

                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Pressable onPress={() => Linking.openURL(`https://${al.linkedin}`)} style={s.iconBtn}>
                            <Linkedin size={12} color={SC.muted} />
                          </Pressable>
                        </View>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
              {alumniList.length > 3 && (
                <View style={s.viewMoreContainer}>
                  {alumniLimit < alumniList.length ? (
                    <Pressable 
                      onPress={() => setAlumniLimit(prev => Math.min(prev + 3, alumniList.length))} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Load More</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={() => setAlumniLimit(3)} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Show Less</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Section 3: From Your College */}
          {studentsList.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeaderRow}>
                <View style={[s.secIconBg, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                  <GraduationCap size={14} color="#93C5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>From Your College</Text>
                    <View style={s.secBadge}><Text style={s.secBadgeText}>{studentsList.length}</Text></View>
                  </View>
                  <Text style={s.secSub}>Students from your college in the SA network</Text>
                </View>
              </View>

              <View style={s.grid}>
                {visibleStudents.map((student) => {
                  const isPending = pending.has(student.id) || student.connectionState === 'pending';
                  const isConnected = conn.has(student.id) || student.connectionState === 'connected';

                  return (
                    <GlassCard key={student.id} radius={14} padding={16} style={s.card}>
                      <View>
                        <View style={s.cardHead}>
                          <Av initials={student.initials} size={46} color={student.color} photo={student.photo} />
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text numberOfLines={1} style={s.cardName}>{student.name}</Text>
                              <View style={s.badgeStudent}><Text style={s.badgeStudentText}>Student</Text></View>
                            </View>
                            <Text numberOfLines={1} style={s.cardRole}>{student.role}</Text>
                            <Text numberOfLines={1} style={s.cardCompany}>{student.company}</Text>
                          </View>
                        </View>

                        <View style={s.tagsRow}>
                          {student.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                          ))}
                        </View>

                        <View style={s.mutualRow}>
                          <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                          <Text style={s.mutualText}>{student.mutual} mutual connections</Text>
                        </View>
                      </View>

                      <View style={s.cardActions}>
                        <Pressable onPress={() => setPickedPerson(student)} style={s.actionBtnOutline}>
                          <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                          <Text style={s.actionBtnOutlineText}>View Profile</Text>
                        </Pressable>

                        {isConnected ? (
                          <View style={s.connectedBadge}>
                            <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                            <Text style={s.connectedText}>Connected</Text>
                          </View>
                        ) : isPending ? (
                          <View style={s.pendingBadge}>
                            <Clock size={11} color={SC.amber} style={{ marginRight: 4 }} />
                            <Text style={s.pendingText}>Pending</Text>
                          </View>
                        ) : (
                          <Pressable onPress={() => handleConnect(student.id, student.name)} style={s.actionBtnOutline}>
                            <UserPlus size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                            <Text style={s.actionBtnOutlineText}>Connect</Text>
                          </Pressable>
                        )}

                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Pressable onPress={() => Linking.openURL(`https://${student.linkedin}`)} style={s.iconBtn}>
                            <Linkedin size={12} color={SC.muted} />
                          </Pressable>
                        </View>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
              {studentsList.length > 3 && (
                <View style={s.viewMoreContainer}>
                  {studentLimit < studentsList.length ? (
                    <Pressable 
                      onPress={() => setStudentLimit(prev => Math.min(prev + 3, studentsList.length))} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Load More</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={() => setStudentLimit(3)} 
                      style={s.viewMoreBtn}
                    >
                      <Text style={s.viewMoreBtnText}>Show Less</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {rawPeople.length === 0 && (
            <View style={s.emptyCard}>
              <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
              <Text style={s.emptyText}>No network accounts available to show.</Text>
            </View>
          )}
        </View>
      )}

      {/* Connections tab screen */}
      {activeTab === 'connections' && (
        <View style={{ gap: 16 }}>
          <View style={s.secHeaderRow}>
            <View style={[s.secIconBg, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Users size={14} color="#86EFAC" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.secTitle}>My Connections</Text>
                <View style={s.secBadge}><Text style={s.secBadgeText}>{connectionsList.length}</Text></View>
              </View>
              <Text style={s.secSub}>People you are actively connected with</Text>
            </View>
          </View>

          <View style={s.grid}>
            {connectionsList.map((person) => (
              <GlassCard key={person.id} radius={14} padding={16} style={s.card}>
                <View>
                  <View style={s.cardHead}>
                    <Av initials={person.initials} size={46} color={person.color} photo={person.photo} />
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text numberOfLines={1} style={s.cardName}>{person.name}</Text>
                        <View style={person.kind === 'mentor' ? s.badgeMentor : person.kind === 'alumni' ? s.badgeAlumni : s.badgeStudent}>
                          <Text style={person.kind === 'mentor' ? s.badgeMentorText : person.kind === 'alumni' ? s.badgeAlumniText : s.badgeStudentText}>{person.tag}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={s.cardRole}>{person.role}</Text>
                      <Text numberOfLines={1} style={s.cardCompany}>{person.company}</Text>
                    </View>
                  </View>

                  <View style={s.tagsRow}>
                    {person.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                    ))}
                  </View>

                  <View style={s.mutualRow}>
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text style={s.mutualText}>{person.mutual} mutual connections</Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  {person.kind === 'mentor' ? (
                    <>
                      <Pressable onPress={() => viewMentor(person)} style={s.actionBtnOutline}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnOutlineText}>View Profile</Text>
                      </Pressable>
                      <Pressable onPress={() => viewMentor(person)} style={s.actionBtnFill}>
                        <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnFillText}>Book</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} style={s.actionBtnOutline}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnOutlineText}>View Profile</Text>
                      </Pressable>
                      <View style={s.connectedBadge}>
                        <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                        <Text style={s.connectedText}>Connected</Text>
                      </View>
                    </>
                  )}

                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={() => Linking.openURL(`https://${person.linkedin}`)} style={s.iconBtn}>
                      <Linkedin size={12} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}

            {connectionsList.length === 0 && (
              <View style={s.emptyCard}>
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>No connections fit the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Book a Mentor tab screen */}
      {activeTab === 'book' && (
        <View style={{ gap: 16 }}>
          <View style={s.secHeaderRow}>
            <View style={[s.secIconBg, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Briefcase size={14} color="#86EFAC" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.secTitle}>All Mentors</Text>
                <View style={s.secBadge}><Text style={s.secBadgeText}>{mentorsList.length}</Text></View>
              </View>
              <Text style={s.secSub}>Browse experts and schedule your 1:1 sessions</Text>
            </View>
          </View>

          <View style={s.grid}>
            {mentorsList.map((m) => (
              <GlassCard key={m.id} radius={14} padding={16} style={s.card}>
                <View>
                  <View style={s.cardHead}>
                    <Av initials={m.initials} size={46} color={m.color} photo={m.photo} />
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text numberOfLines={1} style={s.cardName}>{m.name}</Text>
                        <View style={s.badgeMentor}><Text style={s.badgeMentorText}>MENTOR</Text></View>
                      </View>
                      <Text numberOfLines={1} style={s.cardRole}>{m.role}</Text>
                      <Text numberOfLines={1} style={s.cardCompany}>{m.company}</Text>
                    </View>
                  </View>

                  <View style={s.tagsRow}>
                    {m.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                    ))}
                  </View>

                  <View style={s.statsRow}>
                    <View style={s.statItem}>
                      <Star size={11} color={SC.amber} fill={SC.amber} />
                      <Text style={s.statText}>{m.rating}</Text>
                    </View>
                    <View style={s.statItem}>
                      <Clock size={11} color={SC.muted} />
                      <Text style={s.statText}>{m.sessions} sessions</Text>
                    </View>
                    <Text style={s.priceText}>{m.price}/session</Text>
                  </View>

                  <View style={s.mutualRow}>
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text style={s.mutualText}>{m.mutual} mutual connections</Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  <Pressable onPress={() => viewMentor(m)} style={s.actionBtnOutline}>
                    <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                    <Text style={s.actionBtnOutlineText}>View Profile</Text>
                  </Pressable>

                  <Pressable onPress={() => viewMentor(m)} style={s.actionBtnFill}>
                    <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={s.actionBtnFillText}>Book</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={() => Linking.openURL(`https://${m.linkedin}`)} style={s.iconBtn}>
                      <Linkedin size={12} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}

            {mentorsList.length === 0 && (
              <View style={s.emptyCard}>
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>No mentors match the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Profile detail Modal */}
      <Modal visible={!!pickedPerson} animationType="fade" transparent onRequestClose={() => setPickedPerson(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPickedPerson(null)} style={{ flex: 1 }} />
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>User Profile</Text>
              <Pressable onPress={() => setPickedPerson(null)} style={s.closeBtn}>
                <X size={16} color={SC.text} />
              </Pressable>
            </View>
            {pickedPerson && (
              <ScrollView style={{ padding: 20 }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Av initials={pickedPerson.initials} size={64} color={pickedPerson.color} photo={pickedPerson.photo} />
                  <Text style={s.mName}>{pickedPerson.name}</Text>
                  <View style={[s.mBadge, pickedPerson.kind === 'alumni' ? s.badgeAlumni : s.badgeStudent]}>
                    <Text style={pickedPerson.kind === 'alumni' ? s.badgeAlumniText : s.badgeStudentText}>{pickedPerson.tag}</Text>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={s.mLabel}>ROLE / BRANCH</Text>
                    <Text style={s.mVal}>{pickedPerson.role || '—'}</Text>
                  </View>

                  <View>
                    <Text style={s.mLabel}>COLLEGE / INSTITUTION</Text>
                    <Text style={s.mVal}>{pickedPerson.college || '—'}</Text>
                  </View>

                  {pickedPerson.kind === 'alumni' ? (
                    <View>
                      <Text style={s.mLabel}>CURRENT EMPLOYER</Text>
                      <Text style={s.mVal}>{pickedPerson.company || '—'}</Text>
                    </View>
                  ) : null}

                  <View>
                    <Text style={s.mLabel}>MUTUAL CONNECTIONS</Text>
                    <Text style={s.mVal}>{pickedPerson.mutual} connections</Text>
                  </View>

                  <View>
                    <Text style={s.mLabel}>SKILLS & INTERESTS</Text>
                    <View style={s.tagsRow}>
                      {pickedPerson.tags.map((tag: string, idx: number) => (
                        <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                      ))}
                      {pickedPerson.tags.length === 0 && (
                        <Text style={s.mVal}>No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
                    <Pressable 
                      onPress={() => {
                        Linking.openURL(`https://${pickedPerson.linkedin}`);
                      }}
                      style={s.mSocialBtn}
                    >
                      <Linkedin size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>LinkedIn</Text>
                    </Pressable>

                    <Pressable 
                      onPress={() => setPickedPerson(null)}
                      style={[s.mSocialBtn, { backgroundColor: 'transparent', borderColor: SC.border, borderWidth: 1 }]}
                    >
                      <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 13 }}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 40
  },

  // Sub tab selector styles
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 16
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  tabBtnActive: {
    backgroundColor: SC.primary
  },
  tabBtnText: {
    color: SC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13
  },
  tabBtnTextActive: {
    color: '#fff',
    fontFamily: FONTS.bold
  },

  // Search input styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 20
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },

  // Collapsible section styles
  section: {
    marginBottom: 24,
    gap: 16
  },
  secHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: SC.border,
    borderBottomWidth: 1,
    paddingBottom: 12
  },
  secIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  secTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15,
    letterSpacing: -0.2
  },
  secBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  secBadgeText: {
    color: SC.accentBright,
    fontFamily: FONTS.xbold,
    fontSize: 10
  },
  secSub: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
    marginTop: 2
  },

  // Spacious Grid layouts
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  card: {
    flexGrow: 1,
    flexBasis: 340,
    maxWidth: 460,
    minHeight: 220,
    justifyContent: 'space-between',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  cardName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14.5
  },
  cardRole: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  cardCompany: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Badges styles
  badgeMentor: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeMentorText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  badgeAlumni: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeAlumniText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  badgeStudent: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeStudentText: {
    color: '#93C5FD',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },

  // Tags list
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8
  },
  tagChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6
  },
  tagChipText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 10
  },

  // Stats / ratings
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11
  },
  priceText: {
    color: SC.accentBright,
    fontFamily: FONTS.xbold,
    fontSize: 11.5,
    marginLeft: 'auto'
  },

  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  mutualText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 11
  },

  // Action buttons
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: SC.border,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnOutlineText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  actionBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: SC.primary,
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnFillText: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 11.5
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SC.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1
  },
  connectedText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.22)',
    borderWidth: 1
  },
  pendingText: {
    color: '#FDE047',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },

  // Empty state card
  emptyCard: {
    flex: 1,
    backgroundColor: SC.card,
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  emptyText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    textAlign: 'center'
  },

  // Modal Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modal: {
    backgroundColor: '#0F1326',
    borderColor: SC.border2,
    borderWidth: 1,
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: SC.border,
    borderBottomWidth: 1
  },
  modalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15
  },
  closeBtn: {
    padding: 4,
    ...({ cursor: 'pointer' } as any)
  },

  mName: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18,
    marginTop: 10,
    marginBottom: 4
  },
  mBadge: {
    marginTop: 4
  },
  mLabel: {
    color: SC.dim,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginBottom: 3
  },
  mVal: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    marginBottom: 12
  },
  mSocialBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: SC.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  viewMoreContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16
  },
  viewMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  viewMoreBtnText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 12
  }
});
