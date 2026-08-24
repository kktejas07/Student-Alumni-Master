/**
 * MentorCategoryGrid — picks 1 (mentor) or up to 3 (alumni) mentor archetypes.
 *
 * 10 categories grouped into 5 functional sections, each rendered as a card with
 * Lucide icon + title + 1-line description. Selected cards get a glowing purple ring.
 */
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import {
  Cpu, Users, ClipboardList, UserSquare2, Briefcase, GraduationCap,
  Rocket, BarChart3, Building2, Sparkles, Check,
} from 'lucide-react-native';
import type { MentorCategory } from '@/src/models/entities';

interface CategorySpec {
  id: MentorCategory;
  label: string;
  desc: string;
  icon: any;
  group: string;
  groupIcon: any;
}

export const MENTOR_ARCHETYPES: CategorySpec[] = [
  // Tech & Engineering
  { id: 'it_software',         label: 'IT / Software Engineer',
    desc: 'SDE · Tech Lead · Architect',
    icon: Cpu, group: 'Tech & Engineering', groupIcon: Cpu },
  { id: 'engineering_manager', label: 'Engineering / Product Manager',
    desc: 'EM · PM · Team Lead · OKRs',
    icon: ClipboardList, group: 'Tech & Engineering', groupIcon: Cpu },

  // Talent & People
  { id: 'tech_recruiter',      label: 'Technical Recruiter',
    desc: 'Sourcing · Interview screening · ATS',
    icon: UserSquare2, group: 'Talent & People', groupIcon: Users },
  { id: 'hr_mentor',           label: 'HR / People Ops Mentor',
    desc: 'Talent acquisition · Comp · Performance',
    icon: Users, group: 'Talent & People', groupIcon: Users },

  // Career Development
  { id: 'career_coach',        label: 'Career Skill Coach',
    desc: 'Resume · Mock interviews · Soft skills',
    icon: Sparkles, group: 'Career Development', groupIcon: GraduationCap },
  { id: 'higher_education',    label: 'Higher Education Advisor',
    desc: 'MS / PhD · GRE / IELTS · SOPs',
    icon: GraduationCap, group: 'Career Development', groupIcon: GraduationCap },

  // Entrepreneurship
  { id: 'startup_mentor',      label: 'Startup Mentor',
    desc: 'MVP · Early-stage ops · Hiring · PMF',
    icon: Rocket, group: 'Entrepreneurship', groupIcon: Rocket },
  { id: 'startup_advisor',     label: 'Startup Advisor',
    desc: 'Board · Fundraising · Equity · Scaling',
    icon: BarChart3, group: 'Entrepreneurship', groupIcon: Rocket },

  // Business & Strategy
  { id: 'business_mentor',     label: 'Business / MBA Mentor',
    desc: 'MBA prep · Corporate ladder · Family biz',
    icon: Briefcase, group: 'Business & Strategy', groupIcon: Building2 },
  { id: 'industry_advisor',    label: 'Industry Advisor',
    desc: 'Domain expertise · Market strategy',
    icon: Building2, group: 'Business & Strategy', groupIcon: Building2 },
];

interface Props {
  selected: MentorCategory[];               // empty array if none
  onChange: (next: MentorCategory[]) => void;
  multi?: boolean;                          // false = single-select (mentor)
  max?: number;                             // upper bound for multi-select (default 3)
  testIDPrefix?: string;
}

export function MentorCategoryGrid({
  selected, onChange, multi = false, max = 3, testIDPrefix = 'mentor-cat',
}: Props) {
  const groups = MENTOR_ARCHETYPES.reduce<Record<string, CategorySpec[]>>(
    (acc, c) => { (acc[c.group] = acc[c.group] || []).push(c); return acc; },
    {},
  );

  const togglePick = (id: MentorCategory) => {
    if (!multi) { onChange([id]); return; }
    const has = selected.includes(id);
    if (has) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };

  return (
    <View>
      {Object.entries(groups).map(([groupName, items]) => {
        const Icon = items[0].groupIcon;
        return (
          <View key={groupName} style={{ marginBottom: 14 }}>
            <View style={styles.groupHeader}>
              <Icon size={12} color="#A78BFA" />
              <Text style={styles.groupTitle}>{groupName}</Text>
              <View style={styles.groupRule} />
            </View>
            <View style={styles.grid}>
              {items.map((item) => {
                const active = selected.includes(item.id);
                const ItemIcon = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => togglePick(item.id)}
                    testID={`${testIDPrefix}-${item.id}`}
                    style={({ hovered, pressed }: any) => [
                      styles.card,
                      hovered && styles.cardHover,
                      pressed && styles.cardPressed,
                      active && styles.cardActive,
                    ]}
                  >
                    <View style={[styles.cardIconWrap, active && styles.cardIconWrapActive]}>
                      <ItemIcon size={18} color={active ? '#FFFFFF' : '#C4B5FD'} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.cardTitle, active && { color: '#FFFFFF' }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                    </View>
                    {active && (
                      <View style={styles.checkBadge}>
                        <Check size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {multi && (
        <Text style={styles.helperBar}>
          {selected.length}/{max} selected · pick up to {max} archetypes that fit you
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, paddingHorizontal: 2,
  },
  groupTitle: {
    color: '#C4B5FD', fontFamily: 'DMSans_700Bold',
    fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  groupRule: { flex: 1, height: 1, backgroundColor: 'rgba(196,181,253,0.10)', marginLeft: 6 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  card: {
    flexBasis: '48%', flexGrow: 1, minWidth: 220,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  cardHover: {
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderColor: 'rgba(167,139,250,0.35)',
    ...(Platform.OS === 'web' ? ({ transform: 'translateY(-1px)' } as any) : {}),
  },
  cardPressed: { backgroundColor: 'rgba(124,58,237,0.18)' },
  cardActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(196,181,253,0.65)',
    boxShadow: '0px 6px 18px rgba(124,58,237,0.35)',
  },
  cardIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(196,181,253,0.20)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconWrapActive: {
    backgroundColor: '#7C3AED',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  cardTitle: { color: '#E9E3FF', fontFamily: 'DMSans_600SemiBold', fontSize: 13.5, marginBottom: 2 },
  cardDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, lineHeight: 15 },
  checkBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
  },
  helperBar: {
    marginTop: 4, marginBottom: 8,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_500Medium', fontSize: 11.5,
  },
});
