import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radius, space, type } from '../theme';
import { Btn, Card, Chip, Field, Label, Pill, ProgressBar, Ring } from '../components/ui';

const STEPS = [
  { key: 'who', crumb: 'About you' },
  { key: 'account', crumb: 'Your account' },
  { key: 'verify', crumb: 'Verification' },
  { key: 'course', crumb: 'Academics' },
  { key: 'goal', crumb: 'Your goal' },
  { key: 'interests', crumb: 'Interests' },
  { key: 'roadmap', crumb: 'Your roadmap' },
  { key: 'perks', crumb: 'Perks & offers' },
  { key: 'card', crumb: 'Your SA card' },
  { key: 'done', crumb: 'Done' }
];

const INTERESTS = ['Software Engineering', 'Product Management', 'Data Science', 'AI / ML', 'Design / UX', 'Cybersecurity', 'Cloud / DevOps', 'Finance', 'Consulting', 'Research'];

const PERKS = [
  { pct: '40%', sub: 'off first term', title: 'Mentor sessions', body: 'Any paid one-to-one, first three bookings.', code: 'MRIT-MENTOR-40' },
  { pct: '₹0', sub: 'for 6 months', title: 'Resume Pro', body: 'Unlimited ATS rewrites and role-matched keywords.', code: 'SA-RESUME-6M' },
  { pct: '2', sub: 'free passes', title: 'Partner workshops', body: 'Any paid workshop from a partner company this term.', code: 'SA-WORKSHOP-2X' }
];

export default function OnboardingScreen() {
  const { t, toggle } = useTheme();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(['Software Engineering']);
  const [copied, setCopied] = useState(null);
  const step = STEPS[i];
  const pct = Math.round((i / (STEPS.length - 1)) * 100);

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 480, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [i]);

  const toggleInterest = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg2 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -60, top: -80, width: 400, height: 400 }}>
        <LinearGradient colors={[t.glow[0], 'transparent']} style={{ flex: 1, borderRadius: 200 }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', right: -70, bottom: -60, width: 360, height: 360 }}>
        <LinearGradient colors={[t.glow[1], 'transparent']} style={{ flex: 1, borderRadius: 180 }} />
      </View>

      <View style={{ paddingTop: 50, backgroundColor: t.bg2 + 'E6', borderBottomWidth: 1, borderColor: t.line }}>
        <ProgressBar pct={pct} height={3} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <LinearGradient colors={t.ramp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 26, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 11, color: '#FFFFFF' }}>SA</Text>
            </LinearGradient>
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: t.text }}>{step.crumb}</Text>
          </View>
          <Pressable onPress={toggle}><Text style={[type.meta, { color: t.muted }]}>Step {i + 1} of {STEPS.length}</Text></Pressable>
        </View>
      </View>

      <Animated.View style={{
        flex: 1,
        opacity: slide,
        transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
      }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {step.key === 'who' && (
            <Body title="Who are you here as?" sub="This shapes everything that follows.">
              {['Student', 'Alumnus / mentor', 'College admin'].map((o, k) => (
                <Card key={o} style={{ marginBottom: 10, borderColor: k === 0 ? t.accent : t.line }}>
                  <Text style={[type.h3, { color: t.text }]}>{o}</Text>
                  <Text style={[type.meta, { color: t.muted, marginTop: 4 }]}>
                    {k === 0 ? 'Build a roadmap, find mentors, apply through the network.' : k === 1 ? 'Offer sessions and referrals to your college.' : 'Bring your cohort and departments onto the platform.'}
                  </Text>
                </Card>
              ))}
            </Body>
          )}

          {step.key === 'account' && (
            <Body title="Create your account" sub="Your college email unlocks verification and perks.">
              <Field label="FULL NAME" value="Devender Vutukuru" />
              <Field label="COLLEGE EMAIL" placeholder="you@college.edu" />
              <Field label="PASSWORD" placeholder="At least 8 characters" />
            </Body>
          )}

          {step.key === 'verify' && (
            <Body title="Verify your college email" sub="We sent a six-digit code. It expires in 10 minutes.">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[4, 8, 2, 1, 9, 3].map((d, k) => (
                  <View key={k} style={{ flex: 1, aspectRatio: 0.78, borderRadius: radius.ctl, borderWidth: 1, borderColor: k < 4 ? t.accent : t.line2, backgroundColor: t.panel2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: k < 4 ? t.text : t.dim }}>{k < 4 ? d : ''}</Text>
                  </View>
                ))}
              </View>
            </Body>
          )}

          {step.key === 'course' && (
            <Body title="Your academics" sub="Used for peer and mentor matching.">
              <Field label="COLLEGE" value="Khammam Institute of Technologies and Sciences" />
              <Field label="BRANCH" value="Computer Science" />
              <Field label="GRADUATION YEAR" value="2027" />
            </Body>
          )}

          {step.key === 'goal' && (
            <Body title="What are you working toward?" sub="Agent K builds the roadmap around this.">
              {['A role at a top product company', 'Higher studies abroad', 'A startup of my own', 'Still deciding'].map((o, k) => (
                <Card key={o} style={{ marginBottom: 10, borderColor: k === 0 ? t.accent : t.line }}>
                  <Text style={[type.h3, { color: t.text }]}>{o}</Text>
                </Card>
              ))}
            </Body>
          )}

          {step.key === 'interests' && (
            <Body title="Pick your interests" sub={`Pick at least 3 — ${picked.length} selected.`}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {INTERESTS.map((k) => (
                  <Chip key={k} on={picked.includes(k)} onPress={() => toggleInterest(k)}>{k}</Chip>
                ))}
              </View>
            </Body>
          )}

          {step.key === 'roadmap' && (
            <Body title="Your first roadmap" sub="It rebuilds itself as your skills move.">
              <Card>
                <Label color={t.accentLt}>CURRENT READINESS</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <Ring pct={36} size={104} stroke={8} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h2, { color: t.text }]}>Builder</Text>
                    <Text style={[type.meta, { color: t.muted, marginTop: 4 }]}>Target: Industry Ready · ETA ~18 weeks</Text>
                    <Pill tone="ok">↗ +8% this week</Pill>
                  </View>
                </View>
              </Card>
              <View style={{ height: space.md }} />
              <Card>
                <Label>NEXT MILESTONE</Label>
                <Text style={[type.h3, { color: t.text, marginBottom: 12 }]}>Build your professional resume</Text>
                <ProgressBar pct={60} />
                <Text style={[type.meta, { color: t.muted, marginTop: 10 }]}>60% completed</Text>
              </Card>
            </Body>
          )}

          {step.key === 'perks' && (
            <Body title="Your perks are live" sub="Claim now or later — codes never expire silently.">
              {PERKS.map((p, k) => (
                <Card key={p.code} tinted={k === 0} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 34, letterSpacing: -1.6, color: k === 0 ? t.accentLt : t.text }}>{p.pct}</Text>
                    <Text style={[type.meta, { color: t.muted }]}>{p.sub}</Text>
                  </View>
                  <Text style={[type.h3, { color: t.text }]}>{p.title}</Text>
                  <Text style={[type.meta, { color: t.muted, marginTop: 5, marginBottom: 16 }]}>{p.body}</Text>
                  <Pressable onPress={() => setCopied(p.code)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderStyle: 'dashed', borderWidth: 1, borderColor: copied === p.code ? t.accent : t.line2, borderRadius: radius.ctl, padding: 13 }}>
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 13.5, color: t.text }}>{p.code}</Text>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 12.5, color: t.accentLt }}>{copied === p.code ? 'COPIED' : 'COPY'}</Text>
                  </Pressable>
                </Card>
              ))}
            </Body>
          )}

          {step.key === 'card' && (
            <Body title="Your digital card is issued" sub="Show it at campus events and when applying through the network.">
              <LinearGradient colors={t.ramp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.card, padding: 22, aspectRatio: 1.6 }}>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 13, letterSpacing: 1.3, color: '#FFFFFF' }}>SA · STUDENT ALUMNI</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 11 }}>
                      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 10, color: '#FFFFFF' }}>VERIFIED</Text>
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 24, letterSpacing: -0.8, color: '#FFFFFF' }}>Devender Vutukuru</Text>
                    <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>Computer Science · Class of 2027</Text>
                  </View>
                  <View>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(255,255,255,0.72)' }}>STUDENT ID</Text>
                    <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#FFFFFF', marginTop: 4 }}>SA-2026-STU-RNWJMD</Text>
                  </View>
                </View>
              </LinearGradient>
            </Body>
          )}

          {step.key === 'done' && (
            <Body title="You're in" sub="Agent K has your roadmap. Everything else is one tap away.">
              <Card tinted>
                <Ring pct={100} size={96} stroke={8} label="✓" />
                <Text style={[type.h3, { color: t.text, marginTop: 16 }]}>Profile created</Text>
                <Text style={[type.meta, { color: t.muted, marginTop: 6 }]}>SA-2026-STU-RNWJMD · Verified student</Text>
              </Card>
            </Body>
          )}
        </ScrollView>
      </Animated.View>

      <View style={{ flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 34, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.bg2 }}>
        <Btn variant="ghost" style={{ flex: 1 }} onPress={() => setI((n) => Math.max(0, n - 1))}>Back</Btn>
        <Btn style={{ flex: 2 }} onPress={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}>
          {i === STEPS.length - 1 ? 'Go to dashboard' : 'Continue'}
        </Btn>
      </View>
    </View>
  );
}

function Body({ title, sub, children }) {
  const { t } = useTheme();
  return (
    <View>
      <Text style={[type.h1, { color: t.text, marginBottom: 8 }]}>{title}</Text>
      <Text style={[type.body, { color: t.muted, marginBottom: 26 }]}>{sub}</Text>
      {children}
    </View>
  );
}
