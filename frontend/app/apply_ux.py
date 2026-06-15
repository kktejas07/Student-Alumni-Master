import re

with open("career-ai.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Define the new return block
new_return = """  return (
    <Container {...containerProps}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        {!embedded && (
          <Pressable onPress={() => router.back()} style={s.backBtn} testID="career-back">
            <ArrowLeft size={16} color={C.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.title}>AI Career Roadmap</Text>
            <View style={s.onlinePill}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
              <Text style={s.onlinePillText}>Online · Personalised for you</Text>
            </View>
          </View>
          {!!roadmap.suggestion && (
            <Text style={s.suggest}>“{roadmap.suggestion}”</Text>
          )}
        </View>
      </View>

      {/* Overview metrics */}
      <View style={[s.grid, { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as any]}>
        <Metric 
          label="CURRENT READINESS"    
          value={`${readinessScore}%`}   
          sub={readinessLevel} 
          Icon={Target} 
          tint={C.purple} 
          progress={bandProgress} 
          progressLabel={nextGoal}
        />
        <Metric 
          label="POTENTIAL READINESS"    
          value={`${potentialScore}%`}   
          sub={getLevelForScore(potentialScore)} 
          Icon={Sparkles} 
          tint={C.teal} 
        />
        <Metric 
          label="READINESS GAP"    
          value={`${gap}%`}   
          sub="To reach full potential" 
          Icon={GitBranch} 
          tint={C.amber} 
        />
        <Metric label="PROFILE STRENGTH"    value={`${profileStrength}%`}  sub={profileStrength >= 100 ? 'All complete' : `${100 - profileStrength}% to go`} Icon={UserIcon} tint={C.blue} />
        <Metric label="SKILL STREAK"        value={`${skillStreak} days`}  sub={skillStreak ? 'Keep it up!' : 'Start your streak today'} Icon={Flame} tint={C.red} />
      </View>

      {/* Goal banner (target role + progress) */}
      <LinearGradient
        colors={['rgba(109,40,217,0.35)', 'rgba(91,33,182,0.18)', 'rgba(49,46,129,0.12)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.goalCard}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <View style={s.goalIcon}><Target size={14} color={C.purpleL} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.goalLabel}>CURRENT GOAL</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: C.text2, fontSize: 10, fontFamily: FT.bold }}>Estimated Timeline: {estimatedWeeks}</Text>
          </View>
        </View>
        
        <Text style={s.goalRole}>{targetRole} <Text style={{ color: C.purpleL, fontFamily: FT.xbold }}>at a {targetCo}</Text></Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 }}>
            <Text style={{ color: C.text2, fontSize: 11, fontFamily: FT.bold }}>Level: {readinessLevel}</Text>
            <Text style={{ color: C.teal, fontSize: 11, fontFamily: FT.bold }}>Target: {getLevelForScore(potentialScore)}</Text>
        </View>
        <View style={s.goalBarTrack}>
          <LinearGradient
            colors={['#6d28d9', '#a78bfa', '#c4b5fd']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.goalBarFill, { width: `${Math.min(100, progress)}%` }]}
          />
        </View>
      </LinearGradient>

      {/* Recommended Next Actions */}
      {recommendedActions.length > 0 && (
        <>
          <SectionTitle text="RECOMMENDED NEXT ACTIONS" />
          <View style={{ flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {recommendedActions.map((act) => {
              const matched = builds.find(b => b.id.toLowerCase().includes(act.milestone_type?.toLowerCase()?.replace('_', '') || ''));
              return (
                <Pressable
                  key={`act-${act.id}`}
                  onPress={matched?.onPress || (() => toast.info('Action', 'Check your profile settings'))}
                  style={({ pressed, hovered }: any) => [
                    s.actionCard,
                    (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 13 }}>{act.description || act.title}</Text>
                  </View>
                  <View style={s.gainPill}>
                    <Sparkles size={11} color={C.teal} />
                    <Text style={s.gainPillText}>+{gainPerMilestone}% Readiness</Text>
                  </View>
                  <ChevronRight size={16} color={C.dim} style={{ marginLeft: 6 }} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Career Path Detection & Timeline Forecast */}
      {careerIntel && careerIntel.career_path && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10, marginBottom: 16 }}>
          {/* Best Match Path */}
          <View style={[s.card, { flex: 1, minWidth: 300 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Briefcase size={18} color={C.teal} />
              <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 15 }}>Career Path Detection</Text>
            </View>
            
            <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 12 }}>BEST MATCH</Text>
                <Text style={{ color: careerIntel.career_path?.top_match?.path ? C.teal : C.text2, fontFamily: FT.xbold, fontSize: 22 }}>
                  {careerIntel.career_path?.top_match?.label || careerIntel.career_path?.top_match?.path || 'Undecided'}
                </Text>
              </View>
            </View>
            
            {careerIntel.career_path?.top_match?.path && (
              <View>
                <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 12, marginBottom: 4 }}>MISSING SKILLS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(careerIntel.career_path?.top_match?.missing_skills || []).map((ms: string) => (
                    <View key={ms} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(248,113,113,0.1)' }}>
                      <Text style={{ color: C.red, fontFamily: FT.med, fontSize: 11 }}>{ms}</Text>
                    </View>
                  ))}
                  {(!careerIntel.career_path?.top_match?.missing_skills || careerIntel.career_path?.top_match?.missing_skills.length === 0) && (
                    <Text style={{ color: C.green, fontSize: 12 }}>No core skills missing!</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Growth Forecast Timeline */}
          <View style={[s.card, { flex: 1, minWidth: 300 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={18} color={C.purpleL} />
              <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 15 }}>Growth Forecast</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, paddingTop: 10, paddingHorizontal: 10 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.text2, fontSize: 10, fontFamily: FT.bold }}>Today</Text>
                <View style={{ width: 40, height: `${Math.max(10, readinessScore)}%`, backgroundColor: C.purple, borderRadius: 4, opacity: 0.6 }} />
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: FT.xbold }}>{readinessScore}%</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.text2, fontSize: 10, fontFamily: FT.bold }}>Month 1</Text>
                <View style={{ width: 40, height: `${Math.max(10, Math.round(readinessScore + gap * 0.4))}%`, backgroundColor: C.purpleL, borderRadius: 4, opacity: 0.8 }} />
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: FT.xbold }}>{Math.round(readinessScore + gap * 0.4)}%</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.purpleXL, fontSize: 10, fontFamily: FT.bold }}>Month 2</Text>
                <View style={{ width: 40, height: `${Math.max(10, Math.round(readinessScore + gap * 0.8))}%`, backgroundColor: C.purpleXL, borderRadius: 4, opacity: 0.9 }} />
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: FT.xbold }}>{Math.round(readinessScore + gap * 0.8)}%</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.teal, fontSize: 10, fontFamily: FT.bold }}>Potential</Text>
                <View style={{ width: 40, height: `${Math.max(10, potentialScore)}%`, backgroundColor: C.teal, borderRadius: 4, opacity: 1 }} />
                <Text style={{ color: C.teal, fontSize: 12, fontFamily: FT.xbold }}>{potentialScore}%</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Skill scores horizontal bars */}
      <SectionTitle text="SKILLS INTELLIGENCE" />
      <View style={s.skillList}>
        {SKILL_META.map((sk, idx) => {
          const Icon = sk.Icon;
          const pct = Number((roadmap.skill_scores || {})[sk.key] || 0);
          const target = Math.min(100, pct + 15);
          return (
            <View 
              key={sk.key} 
              style={[
                s.skillRow,
                idx === 0 && s.skillRowFirst,
                idx === SKILL_META.length - 1 && s.skillRowLast,
              ]}
            >
              <View style={[s.skillIconBox, { backgroundColor: sk.color + '22', borderColor: sk.color + '50' }]}>
                <Icon size={14} color={sk.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.skillRowLabel}>{sk.label}</Text>
                  <Text style={[s.skillRowPct, { color: sk.color }]}>Current: {pct}% <Text style={{ color: C.text2, fontSize: 11 }}> / Target: {target}%</Text></Text>
                </View>
                <View style={s.barTrack}>
                  <LinearGradient 
                    colors={[sk.color.replace('#', '#1a'), sk.color]} 
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={[s.barFill, { width: `${pct}%` }]} 
                  />
                  <View style={{ position: 'absolute', right: `${100 - target}%`, width: 2, height: '100%', backgroundColor: '#fff', opacity: 0.5 }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Verified Career Progress */}
      <SectionTitle text="VERIFIED CAREER PROGRESS" />
      <View style={{ flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {(roadmap.weekly_plan || []).map((wk, idx) => {
          const isDone = wk.completed || completed.includes(idx);
          return (
            <View key={`prog-${idx}`} style={[s.actionCard, { paddingVertical: 12, opacity: isDone ? 1 : 0.6 }]}>
              {isDone ? <CheckCircle2 size={16} color={C.green} /> : <Circle size={16} color={C.dim} />}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: isDone ? C.text : C.text2, fontFamily: FT.bold, fontSize: 13, textDecorationLine: 'none' }}>
                  {wk.description || wk.title}
                </Text>
                <Text style={{ color: C.dim, fontSize: 10, fontFamily: FT.med, marginTop: 2 }}>{wk.milestone_type || 'MILESTONE'}</Text>
              </View>
              {isDone ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                  <Text style={{ color: C.green, fontSize: 9.5, fontFamily: FT.bold }}>Verified Automatically</Text>
                </View>
              ) : (
                <Text style={{ color: C.dim, fontSize: 10, fontFamily: FT.med }}>Pending</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Build your profile horizontal lists */}
      {pendingBuilds.length > 0 && (
        <>
          <SectionTitle text="BUILD YOUR PROFILE" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {pendingBuilds.map((b) => {
              const Icon = b.Icon;
              return (
                <Pressable key={b.id} onPress={b.onPress} style={({ pressed, hovered }: any) => [s.buildCard, (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }]} testID={`build-${b.id}`}>
                  <View style={[s.buildIcon, { backgroundColor: b.color + '22', borderColor: b.color + '45' }]}>
                    <Icon size={14} color={b.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.buildLabel} numberOfLines={1}>{b.label}</Text>
                    <Text style={s.buildDesc} numberOfLines={1}>{b.desc}</Text>
                  </View>
                  <ChevronRight size={14} color={C.dim} />
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      <Text style={{ color: C.dim, fontFamily: FT.med, fontSize: 11, textAlign: 'center', marginTop: 22 }}>
        Roadmap last generated {roadmap.generated_at ? new Date(roadmap.generated_at).toLocaleString() : '—'} · Powered by Student Alumni AI
      </Text>
    </Container>
  );
}

/* ---------- helpers ---------- */
function Metric({ label, value, sub, Icon, tint, progress, progressLabel }: { label: string; value: string; sub: string; Icon: any; tint: string; progress?: number; progressLabel?: string }) {
  return (
    <View style={s.metricCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={[s.metricIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
          <Icon size={14} color={tint} />
        </View>
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        <Text style={[s.metricValue, { color: tint }]}>{value}</Text>
        <Text style={s.metricSub}>{sub}</Text>
        {progress !== undefined && (
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${progress}%`, height: '100%', backgroundColor: tint, borderRadius: 2 }} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={s.sectionTitle}>{text}</Text>;
}

import { Circle } from 'lucide-react-native';

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.bg },
  embeddedShell: { flex: 1, backgroundColor: 'transparent' },
  card: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 12, padding: 16,
  },

  backBtn: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  title: { color: C.text, fontFamily: FT.xbold, fontSize: 19, letterSpacing: -0.4 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.35)', borderWidth: 1,
  },
  onlinePillText: { color: C.green, fontFamily: FT.bold, fontSize: 9.5 },
  suggest: { color: C.text2, fontFamily: FT.med, fontSize: 11.5, marginTop: 4, fontStyle: 'italic' },

  grid: { display: 'grid' as any, gap: 10, marginBottom: 14 },
  metricCard: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 12, padding: 12, minHeight: 75,
  },
  metricIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  metricLabel: { color: C.text2, fontFamily: FT.bold, fontSize: 8.5, letterSpacing: 0.8 },
  metricValue: { fontFamily: FT.xbold, fontSize: 20, marginTop: 1 },
  metricSub: { color: C.dim, fontFamily: FT.med, fontSize: 9.5, marginTop: 1 },

  goalCard: {
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    borderRadius: 12, padding: 15, marginBottom: 14, overflow: 'hidden'
  },
  goalIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.25)' },
  goalLabel: { color: C.purpleXL, fontFamily: FT.bold, fontSize: 10, letterSpacing: 0.8 },
  goalRole: { color: C.text, fontFamily: FT.xbold, fontSize: 17, marginTop: 2 },
  goalBarTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', marginTop: 8, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },

  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 10, padding: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  gainPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(45,212,191,0.1)', borderColor: 'rgba(45,212,191,0.2)', borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  gainPillText: { color: C.teal, fontFamily: FT.bold, fontSize: 10 },

  sectionTitle: { color: C.text2, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.0, marginTop: 18, marginBottom: 8 },

  skillList: { flexDirection: 'column', maxWidth: 800 },
  skillRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 13, paddingVertical: 11,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderTopWidth: 0,
  },
  skillRowFirst: { borderTopWidth: 1, borderTopLeftRadius: 11, borderTopRightRadius: 11 },
  skillRowLast: { borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },

  skillIconBox: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  skillRowLabel: { color: C.text, fontFamily: FT.bold, fontSize: 12.5 },
  skillRowPct: { fontFamily: FT.xbold, fontSize: 12.5 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  buildCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 10, padding: 9, paddingRight: 11, width: 180,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  buildIcon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  buildLabel: { color: C.text, fontFamily: FT.bold, fontSize: 11 },
  buildDesc:  { color: C.text2, fontFamily: FT.med, fontSize: 9.5, marginTop: 1 },
});
"""

import re
# find from "  return (" down to the end
pattern = re.compile(r"  return \([\s\S]+", re.MULTILINE)
new_code = pattern.sub(new_return, code)

with open("career-ai.tsx", "w", encoding="utf-8") as f:
    f.write(new_code)
print("Done")
