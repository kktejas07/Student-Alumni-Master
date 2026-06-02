/**
 * Mentor Portal — Network View Redesign
 * High-fidelity representation matching the reference mockups exactly.
 * Interactive real-time search, filters, collapsibles, and social integrations.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Search, 
  Video, 
  Activity, 
  ExternalLink,
  MessageSquare,
  Link2,
  Code,
  User,
  Heart,
  Settings
} from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS as MOCK_STUDENTS } from '../data';

type CategoryTab = 'connections' | 'discover' | 'requests';
type FilterType = 'everyone' | 'students' | 'alumnis' | 'mentors' | 'industry';

type ProfessionalPerson = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  tag: 'Industry' | 'Mentor' | 'Alumni';
  role: string;
  company: string;
  tags: string[];
  mutual: number;
  linkedin: string;
  github?: string;
};

const PROFESSIONAL_NETWORK: ProfessionalPerson[] = [
  {
    id: 'p1',
    name: 'Vikram Anand',
    avatar: 'VA',
    color: '#8B5CF6',
    tag: 'Industry',
    role: 'Engineering Manager',
    company: 'Microsoft',
    tags: ['System Design', 'Leadership'],
    mutual: 12,
    linkedin: 'linkedin.com/in/vikramanand'
  },
  {
    id: 'p2',
    name: 'Deepa Krishnan',
    avatar: 'DK',
    color: '#EC4899',
    tag: 'Industry',
    role: 'VP Product',
    company: 'Meesho',
    tags: ['Product', 'Growth'],
    mutual: 8,
    linkedin: 'linkedin.com/in/deepakrishnan'
  },
  {
    id: 'p3',
    name: 'Nikhil Sharma',
    avatar: 'NS',
    color: '#10B981',
    tag: 'Mentor',
    role: 'Co-founder & CTO',
    company: 'Servant AI',
    tags: ['AI/ML', 'Startups'],
    mutual: 6,
    linkedin: 'linkedin.com/in/nikhilsharma',
    github: 'github.com/nikhils'
  },
  {
    id: 'p4',
    name: 'Ravi Teja',
    avatar: 'RT',
    color: '#3B82F6',
    tag: 'Alumni',
    role: 'SDE-3',
    company: 'Stripe',
    tags: ['Fintech', 'Backend'],
    mutual: 3,
    linkedin: 'linkedin.com/in/raviteja',
    github: 'github.com/raviteja'
  },
  {
    id: 'p5',
    name: 'Sonal Kapoor',
    avatar: 'SK',
    color: '#F59E0B',
    tag: 'Industry',
    role: 'Product Designer',
    company: 'Figma',
    tags: ['Design', 'UX'],
    mutual: 5,
    linkedin: 'linkedin.com/in/sonalkapoor'
  },
  {
    id: 'p6',
    name: 'Arnav Mehta',
    avatar: 'AM',
    color: '#14B8A6',
    tag: 'Alumni',
    role: 'Research Scientist',
    company: 'DeepMind',
    tags: ['ML Research', 'PhD'],
    mutual: 9,
    linkedin: 'linkedin.com/in/arnavmehta',
    github: 'github.com/arnavm'
  }
];

function LinkedinGlyph({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Text style={{
      color, fontSize: Math.round(size * 0.8),
      fontFamily: FONTS.xbold,
      fontWeight: '800' as any, letterSpacing: -0.5,
    }}>in</Text>
  );
}

export function NetworkView() {
  const [tab, setTab] = useState<CategoryTab>('connections');
  const [filter, setFilter] = useState<FilterType>('everyone');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsible sections
  const [showStudents, setShowStudents] = useState(true);
  const [showProfessionals, setShowProfessionals] = useState(true);

  // Mapped Mentees (from STUDENTS data.ts)
  const studentsList = MOCK_STUDENTS.slice(0, 6); // Arjun, Priya, Kabir, Sneha, Rohan, Meera

  // Filter students dynamically based on search
  const filteredStudents = studentsList.filter(s => {
    if (filter !== 'everyone' && filter !== 'students') return false;
    const matchText = `${s.name} ${s.branch} ${s.college} ${s.tags ? s.tags.join(' ') : ''}`.toLowerCase();
    return matchText.includes(searchQuery.toLowerCase());
  });

  // Filter professionals dynamically based on search and sub-filters
  const filteredProfessionals = PROFESSIONAL_NETWORK.filter(p => {
    // Filter check
    if (filter === 'students') return false;
    if (filter === 'alumnis' && p.tag !== 'Alumni') return false;
    if (filter === 'mentors' && p.tag !== 'Mentor') return false;
    if (filter === 'industry' && p.tag !== 'Industry') return false;

    // Search query check
    const matchText = `${p.name} ${p.role} ${p.company} ${p.tags.join(' ')} ${p.tag}`.toLowerCase();
    return matchText.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={s.container}>
      
      {/* 1. Header Metrics Grid */}
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(20,184,166,0.1)' }]}>
            <Users size={16} color="#5EEAD4" />
          </View>
          <View>
            <Text style={s.metricValue}>12</Text>
            <Text style={s.metricLabel}>Connections</Text>
          </View>
        </View>

        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Video size={16} color="#93C5FD" />
          </View>
          <View>
            <Text style={s.metricValue}>142</Text>
            <Text style={s.metricLabel}>Sessions done</Text>
          </View>
        </View>

        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
            <Activity size={16} color="#86EFAC" />
          </View>
          <View>
            <Text style={s.metricValue}>4</Text>
            <Text style={s.metricLabel}>Active students</Text>
          </View>
        </View>
      </View>

      {/* 2. Category Tab Row */}
      <View style={s.tabsRow}>
        <Pressable 
          onPress={() => setTab('connections')} 
          style={[s.tabPill, tab === 'connections' && s.tabPillOn]}
        >
          <Users size={13} color={tab === 'connections' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'connections' && s.tabPillTextOn]}>My Connections</Text>
          <View style={[s.countBadge, tab === 'connections' && s.countBadgeOn]}>
            <Text style={[s.countBadgeText, tab === 'connections' && s.countBadgeTextOn]}>12</Text>
          </View>
        </Pressable>

        <Pressable 
          onPress={() => setTab('discover')} 
          style={[s.tabPill, tab === 'discover' && s.tabPillOn]}
        >
          <Activity size={13} color={tab === 'discover' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'discover' && s.tabPillTextOn]}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setTab('requests')} 
          style={[s.tabPill, tab === 'requests' && s.tabPillOn]}
        >
          <User size={13} color={tab === 'requests' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'requests' && s.tabPillTextOn]}>Requests</Text>
          <View style={[s.reqBadge, tab === 'requests' && s.reqBadgeOn]}>
            <Text style={s.reqBadgeText}>2</Text>
          </View>
        </Pressable>
      </View>

      {/* Main Section for Connections Tab */}
      {tab === 'connections' && (
        <View style={{ gap: 16 }}>
          
          {/* Secondary Sub-filters Row */}
          <View style={s.subFiltersRow}>
            <Pressable 
              onPress={() => setFilter('everyone')} 
              style={[s.subFilterChip, filter === 'everyone' && s.subFilterChipOn]}
            >
              <Text style={[s.subFilterText, filter === 'everyone' && s.subFilterTextOn]}>Everyone</Text>
            </Pressable>

            <Pressable 
              onPress={() => setFilter('students')} 
              style={[s.subFilterChip, filter === 'students' && s.subFilterChipOn]}
            >
              <Text style={[s.subFilterText, filter === 'students' && s.subFilterTextOn]}>Students</Text>
            </Pressable>

            <Pressable 
              onPress={() => setFilter('alumnis')} 
              style={[s.subFilterChip, filter === 'alumnis' && s.subFilterChipOn]}
            >
              <Text style={[s.subFilterText, filter === 'alumnis' && s.subFilterTextOn]}>Alumnis</Text>
            </Pressable>

            <Pressable 
              onPress={() => setFilter('mentors')} 
              style={[s.subFilterChip, filter === 'mentors' && s.subFilterChipOn]}
            >
              <Text style={[s.subFilterText, filter === 'mentors' && s.subFilterTextOn]}>Mentors</Text>
            </Pressable>

            <Pressable 
              onPress={() => setFilter('industry')} 
              style={[s.subFilterChip, filter === 'industry' && s.subFilterChipOn]}
            >
              <Text style={[s.subFilterText, filter === 'industry' && s.subFilterTextOn]}>Industry</Text>
            </Pressable>
          </View>

          {/* Search Input Box */}
          <View style={s.searchContainer}>
            <Search size={14} color={MC.dim} style={{ marginRight: 10 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your connections..."
              placeholderTextColor={MC.dim}
              style={s.searchInput}
            />
          </View>

          {/* Subsection A: My Students (Screenshot 1) */}
          {filteredStudents.length > 0 && (
            <View style={s.sectionFrame}>
              <Pressable 
                onPress={() => setShowStudents(!showStudents)} 
                style={s.sectionHeaderRow}
              >
                <GraduationCap size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>My Students</Text>
                    <View style={s.secBadge}>
                      <Text style={s.secBadgeText}>{filteredStudents.length}</Text>
                    </View>
                  </View>
                  <Text style={s.secSub}>Students currently under your mentorship</Text>
                </View>
                <Pressable onPress={() => setShowStudents(!showStudents)} style={s.toggleBtn}>
                  <Text style={s.toggleBtnText}>{showStudents ? 'Show less' : 'Show more'}</Text>
                  {showStudents ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showStudents && (
                <View style={s.cardsGrid}>
                  {filteredStudents.map((student) => {
                    const primaryTag = student.tags && student.tags[0] ? student.tags[0] : 'General';
                    const secondTag = student.tags && student.tags[1] ? student.tags[1] : '';
                    
                    return (
                      <View key={student.id} style={s.profileCard}>
                        {/* Header Profile Info */}
                        <View style={s.cardProfileRow}>
                          <Av initials={student.avatar} size={42} color={student.color} />
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text numberOfLines={1} style={s.nameBold}>{student.name}</Text>
                              <View style={s.rolePillStudent}>
                                <Text style={s.rolePillStudentText}>Student</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={s.subtitleLine}>{student.branch}</Text>
                            <Text numberOfLines={1} style={s.subtitleSubLine}>{student.college}</Text>
                          </View>
                        </View>

                        {/* Skill Pills */}
                        <View style={s.skillsRow}>
                          <View style={s.skillChip}><Text style={s.skillChipText}>{primaryTag}</Text></View>
                          {secondTag && (
                            <View style={s.skillChip}><Text style={s.skillChipText}>{secondTag}</Text></View>
                          )}
                        </View>

                        {/* Mutual Connection Counter */}
                        <View style={s.mutualRow}>
                          <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                          <Text style={s.mutualText}>{student.messages || 1} mutual connection{student.messages === 1 ? '' : 's'}</Text>
                        </View>

                        {/* Mentoring progress bar */}
                        <View style={s.progressRow}>
                          <View style={s.progressTrack}>
                            <View style={[s.progressFill, { width: `${student.progress}%` }]} />
                          </View>
                          <Text style={s.progressText}>{student.progress}% mentoring progress</Text>
                        </View>

                        {/* Card Action Row */}
                        <View style={s.cardActions}>
                          <Pressable 
                            onPress={() => alert(`Opening student profile: ${student.name}`)}
                            style={({ hovered }: any) => [s.viewProfileBtn, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={s.viewProfileBtnText}>View Profile</Text>
                          </Pressable>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => alert(`Starting session schedule with ${student.name}`)} style={[s.iconSquareBtn, { borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            {student.linkedin && (
                              <Pressable onPress={() => Linking.openURL(`https://${student.linkedin}`)} style={[s.iconSquareBtn, { backgroundColor: '#0A66C2' }]}>
                                <LinkedinGlyph size={13} color="#fff" />
                              </Pressable>
                            )}
                            {student.github && (
                              <Pressable onPress={() => Linking.openURL(`https://${student.github}`)} style={[s.iconSquareBtn, { backgroundColor: '#24292e' }]}>
                                <Code size={13} color="#fff" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Subsection B: Industry, Alumni & Mentors (Screenshot 2) */}
          {filteredProfessionals.length > 0 && (
            <View style={s.sectionFrame}>
              <Pressable 
                onPress={() => setShowProfessionals(!showProfessionals)} 
                style={s.sectionHeaderRow}
              >
                <Briefcase size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>Industry, Alumni & Mentors</Text>
                    <View style={s.secBadge}>
                      <Text style={s.secBadgeText}>{filteredProfessionals.length}</Text>
                    </View>
                  </View>
                  <Text style={s.secSub}>Your professional network on SA</Text>
                </View>
                <Pressable onPress={() => setShowProfessionals(!showProfessionals)} style={s.toggleBtn}>
                  <Text style={s.toggleBtnText}>{showProfessionals ? 'Show less' : 'Show more'}</Text>
                  {showProfessionals ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showProfessionals && (
                <View style={s.cardsGrid}>
                  {filteredProfessionals.map((person) => {
                    const badgeColor = person.tag === 'Industry' ? s.rolePillIndustry : person.tag === 'Mentor' ? s.rolePillMentor : s.rolePillAlumni;
                    const badgeText = person.tag === 'Industry' ? s.rolePillIndustryText : person.tag === 'Mentor' ? s.rolePillMentorText : s.rolePillAlumniText;

                    return (
                      <View key={person.id} style={s.profileCard}>
                        {/* Header Profile Info */}
                        <View style={s.cardProfileRow}>
                          <Av initials={person.avatar} size={42} color={person.color} />
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text numberOfLines={1} style={s.nameBold}>{person.name}</Text>
                              <View style={[s.rolePillBase, badgeColor]}>
                                <Text style={[s.rolePillBaseText, badgeText]}>{person.tag}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={s.subtitleLine}>{person.role}</Text>
                            <Text numberOfLines={1} style={s.subtitleSubLine}>{person.company}</Text>
                          </View>
                        </View>

                        {/* Skill Pills */}
                        <View style={s.skillsRow}>
                          {person.tags.map((skill, sIdx) => (
                            <View key={sIdx} style={s.skillChip}><Text style={s.skillChipText}>{skill}</Text></View>
                          ))}
                        </View>

                        {/* Mutual Connection Counter */}
                        <View style={s.mutualRow}>
                          <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                          <Text style={s.mutualText}>{person.mutual} mutual connections</Text>
                        </View>

                        {/* Card Action Row */}
                        <View style={[s.cardActions, { marginTop: 14 }]}>
                          <Pressable 
                            onPress={() => alert(`Opening profile: ${person.name}`)}
                            style={({ hovered }: any) => [s.viewProfileBtn, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={s.viewProfileBtnText}>View Profile</Text>
                          </Pressable>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => alert(`Starting message chat with ${person.name}`)} style={[s.iconSquareBtn, { borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => Linking.openURL(`https://${person.linkedin}`)} style={[s.iconSquareBtn, { backgroundColor: '#0A66C2' }]}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => Linking.openURL(`https://${person.github}`)} style={[s.iconSquareBtn, { backgroundColor: '#24292e' }]}>
                                <Code size={13} color="#fff" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {filteredStudents.length === 0 && filteredProfessionals.length === 0 && (
            <Text style={{ color: MC.muted, fontFamily: FONTS.med, padding: 30, textAlign: 'center' }}>
              No connections found matching your search.
            </Text>
          )}
        </View>
      )}

      {/* Stubs for Discover / Requests Tabs */}
      {tab === 'discover' && (
        <View style={s.stubCard}>
          <Activity size={24} color={MC.tealP} style={{ marginBottom: 10 }} />
          <Text style={s.stubTitle}>Discover New Mentors & Mentees</Text>
          <Text style={s.stubSub}>
            Expand your network! Here you can discover recommended colleagues, alumni partners, and students looking for mentorship in your specific areas of expertise.
          </Text>
          <Pressable onPress={() => setTab('connections')} style={s.stubBtn}>
            <Text style={s.stubBtnText}>Back to Connections</Text>
          </Pressable>
        </View>
      )}

      {tab === 'requests' && (
        <View style={s.stubCard}>
          <User size={24} color="#F59E0B" style={{ marginBottom: 10 }} />
          <Text style={s.stubTitle}>Session & Connection Invites</Text>
          <Text style={s.stubSub}>
            You have 2 pending session requests waiting for approval. Check the "Session Requests" sidebar link to approve or decline them!
          </Text>
          <Pressable onPress={() => setTab('connections')} style={s.stubBtn}>
            <Text style={s.stubBtnText}>Back to Connections</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 2,
    width: '100%'
  },
  
  // 1. Metric Cards styles
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricValue: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18,
    letterSpacing: -0.4
  },
  metricLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
    marginTop: 2
  },

  // 2. Tab row styles
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 16
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  tabPillOn: {
    backgroundColor: '#14B8A6'
  },
  tabPillText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12.5
  },
  tabPillTextOn: {
    color: '#090D16',
    fontFamily: FONTS.bold
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  countBadgeOn: {
    backgroundColor: 'rgba(9, 13, 22, 0.15)'
  },
  countBadgeText: {
    color: MC.muted,
    fontFamily: FONTS.xbold,
    fontSize: 10
  },
  countBadgeTextOn: {
    color: '#090D16'
  },
  reqBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(245,158,11,0.18)'
  },
  reqBadgeOn: {
    backgroundColor: 'rgba(9, 13, 22, 0.15)'
  },
  reqBadgeText: {
    color: '#F59E0B',
    fontFamily: FONTS.xbold,
    fontSize: 10
  },

  // Subfilters style
  subFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  subFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },
  subFilterChipOn: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.35)'
  },
  subFilterText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12
  },
  subFilterTextOn: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold
  },

  // Search input style
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },

  // Subsections and Collapsibles
  sectionFrame: {
    gap: 14,
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
    ...({ cursor: 'pointer' } as any)
  },
  secTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15,
    letterSpacing: -0.2
  },
  secSub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
    marginTop: 2
  },
  secBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(20,184,166,0.1)'
  },
  secBadgeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.xbold,
    fontSize: 9.5
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(20,184,166,0.06)',
    ...({ cursor: 'pointer' } as any)
  },
  toggleBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11
  },

  // Cards grid layout
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },

  // Profile Grid Card layout
  profileCard: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 350,
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  cardProfileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  nameBold: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14.5
  },
  subtitleLine: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  subtitleSubLine: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Mentees student tag
  rolePillStudent: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(34,197,94,0.12)'
  },
  rolePillStudentText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },

  // Professional badges
  rolePillBase: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  rolePillBaseText: {
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  rolePillIndustry: {
    backgroundColor: 'rgba(245,158,11,0.12)'
  },
  rolePillIndustryText: {
    color: '#FCD34D'
  },
  rolePillMentor: {
    backgroundColor: 'rgba(20,184,166,0.12)'
  },
  rolePillMentorText: {
    color: '#5EEAD4'
  },
  rolePillAlumni: {
    backgroundColor: 'rgba(59,130,246,0.12)'
  },
  rolePillAlumniText: {
    color: '#93C5FD'
  },

  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2
  },
  skillChip: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1
  },
  skillChipText: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10
  },

  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  mutualText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11
  },

  // Mentorship Progress Bar
  progressRow: {
    marginTop: 4,
    gap: 5
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3
  },
  progressText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: MC.border,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#14B8A6',
    ...({ cursor: 'pointer' } as any)
  },
  viewProfileBtnText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 11
  },
  iconSquareBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  // Stub structures
  stubCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    textAlign: 'center'
  },
  stubTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  stubSub: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 8
  },
  stubBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: MC.border2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  stubBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 12
  }
});
