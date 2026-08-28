import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useTheme, radius, space, type } from '../theme';
import { Card, Btn, Pill, Label, Ring, ProgressBar, StatRow, Counter, Marquee } from '../components/ui';

const TASKS = [
  { t: 'Refine your resume for the Google SWE referral', m: '4 min · closes Friday' },
  { t: 'Prep 3 questions for the mentor call', m: '2 min · tomorrow 6pm' },
  { t: 'Apply to 2 matched roles closing this week', m: '6 min · 2 of 267 matches' }
];

const MATCHES = [
  { r: 'Account Executive', c: 'Boulevard · USA', p: '₹22-28 LPA', m: 30, i: 1 },
  { r: 'Senior Brand Content Manager', c: 'Demandbase · USA', p: '₹14-18 LPA', m: 30, i: 2 },
  { r: 'Principal Revenue Ops Manager', c: 'Jobber · Canada', p: '₹32-38 LPA', m: 30, i: 4 }
];

const MENTORS = [
  { n: 'Priya Mehta', r: 'PM @ Microsoft · ★ 4.8', i: 3 },
  { n: 'Arjun Verma', r: 'Data Scientist @ Amazon · ★ 4.7', i: 4 },
  { n: 'Vikram Singh', r: 'Cloud Architect @ AWS · ★ 4.9', i: 5 }
];

const EVENTS = [
  { n: 'HackWave 3.0', w: 'Sep 04 · Sreenidhi', i: 0 },
  { n: 'Voice of Generations', w: 'Sep 12 · VNRVJIT', i: 4 },
  { n: 'Alumni AMA · Product', w: 'Sep 18 · Online', i: 3 },
  { n: 'Resume Clinic', w: 'Sep 21 · Block C', i: 2 },
  { n: 'Cloud Bootcamp', w: 'Sep 26 · AWS + SA', i: 1 }
];

export default function DashboardScreen() {
  const { t, toggle } = useTheme();
  const [done, setDone] = useState([]);
  const [countdown, setCountdown] = useState(28 * 3600 + 14 * 60 + 6);

  useEffect(() => {
    const id = setInterval(() => setCountdown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(Math.floor(countdown / 3600))}:${pad(Math.floor((countdown % 3600) / 60))}:${pad(countdown % 60)}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -70, top: -110, width: 440, height: 440 }}>
        <LinearGradient colors={[t.glow[0], 'transparent']} style={{ flex: 1, borderRadius: 220 }} />
      </View>

      <View style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderColor: t.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[type.h2, { color: t.text }]}>Good morning, Devender</Text>
            <Text numberOfLines={1} style={[type.meta, { color: t.muted, marginTop: 2 }]}>Here's your personalised dashboard for today</Text>
          </View>
          <Pressable onPress={toggle} style={{ width: 38, height: 38, borderRadius: radius.ctl, borderWidth: 1, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.muted, fontSize: 14 }}>{t.name === 'dark' ? '☀' : '☾'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: space.md }} showsVerticalScrollIndicator={false}>
        <Tile delay={0}>
          <Label color={t.accentLt}>CAREER READINESS</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Ring pct={36} size={112} stroke={9} />
            <View style={{ flex: 1 }}>
              <Text style={[type.h2, { color: t.text }]}>Builder</Text>
              <Text style={[type.meta, { color: t.muted, marginTop: 3, marginBottom: 10 }]}>Target: Industry Ready</Text>
              <Pill tone="ok">↗ +8% this week</Pill>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderColor: t.line, marginTop: 18, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
              <Text style={[type.body, { color: t.text, fontFamily: 'Outfit_600SemiBold' }]}>Build your professional resume</Text>
              <Text style={[type.meta, { color: t.accentLt }]}>60%</Text>
            </View>
            <ProgressBar pct={60} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={[type.meta, { color: t.muted }]}>ETA ~18 weeks</Text>
              <Btn>Continue now</Btn>
            </View>
          </View>
        </Tile>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}><StatRow label="APPLICATIONS" sub="267 matches open" value="0" color={t.cats[0]} /></View>
          <View style={{ flex: 1 }}><StatRow label="NETWORK" sub="Connections" value="0" color={t.cats[4]} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}><StatRow label="EVENTS" sub="Registered" value="8" color={t.cats[3]} /></View>
          <View style={{ flex: 1 }}><StatRow label="STREAK" sub="Start today" value="0" color={t.cats[2]} /></View>
        </View>

        <Tile delay={140}>
          <Label color={t.accentLt}>TODAY'S FOCUS · AGENT K</Label>
          {TASKS.map((task, k) => {
            const on = done.includes(k);
            return (
              <Pressable key={task.t} onPress={() => setDone((d) => (on ? d.filter((x) => x !== k) : [...d, k]))}
                style={{
                  flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                  backgroundColor: t.panel2, borderColor: on ? t.accent : t.line2, borderWidth: 1,
                  borderRadius: radius.nest, padding: 13, marginBottom: 9, opacity: on ? 0.72 : 1
                }}>
                <View style={{ width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {on ? <Text style={{ color: t.onAccent, fontSize: 11 }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: t.text }]}>{task.t}</Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: t.dim, marginTop: 4 }}>{task.m}</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={[type.meta, { color: t.muted, marginTop: 4 }]}>
            <Text style={{ color: t.accentLt, fontFamily: 'Outfit_600SemiBold' }}>{done.length} of {TASKS.length}</Text> done today
          </Text>
        </Tile>

        <Tile delay={210}>
          <Label>NEXT SESSION</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.cats[0], alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFFFFF' }}>RS</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[type.h3, { color: t.text }]}>Rahul Sharma</Text>
              <Text numberOfLines={1} style={[type.meta, { color: t.muted, marginTop: 2 }]}>Senior SDE @ Google</Text>
            </View>
            <Pill tone="ok">CONFIRMED</Pill>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: t.line, paddingTop: 15 }}>
            <View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 19, letterSpacing: -0.4, color: t.text }}>{clock}</Text>
              <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: t.muted, marginTop: 3 }}>Thursday · 6:00 pm IST</Text>
            </View>
            <Btn>Join room</Btn>
          </View>
        </Tile>

        <Tile delay={280}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={[type.label, { color: t.accentLt }]}>TOP MATCHES FOR YOU</Text>
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12.5, color: t.accentLt }}>View all 267</Text>
          </View>
          {MATCHES.map((m) => (
            <View key={m.r} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: t.cats[m.i] + '26' }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[type.body, { color: t.text, fontFamily: 'Outfit_600SemiBold' }]}>{m.r}</Text>
                <Text numberOfLines={1} style={[type.meta, { color: t.muted, marginTop: 2 }]}>{m.c} · {m.p}</Text>
                <View style={{ marginTop: 7 }}><ProgressBar pct={m.m} height={5} /></View>
              </View>
              <Btn color={t.cats[m.i]}>Apply</Btn>
            </View>
          ))}
        </Tile>

        <Tile delay={350}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={[type.label, { color: t.ok }]}>MENTORS WITH CAPACITY</Text>
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12.5, color: t.ok }}>View all</Text>
          </View>
          {MENTORS.map((m) => (
            <View key={m.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.cats[m.i], alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#FFFFFF' }}>{m.n.split(' ').map((s) => s[0]).join('')}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[type.body, { color: t.text, fontFamily: 'Outfit_600SemiBold' }]}>{m.n}</Text>
                <Text numberOfLines={1} style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: t.muted, marginTop: 2 }}>{m.r}</Text>
              </View>
              <Btn variant="ghost">Book</Btn>
            </View>
          ))}
        </Tile>

        <Tile delay={420}>
          <Label>NETWORK GROWTH</Label>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginBottom: 10 }}>
            <Counter value={8} />
            <Text style={[type.meta, { color: t.muted }]}>events registered</Text>
          </View>
          <Sparkline />
          <Text style={[type.meta, { color: t.muted, marginTop: 10 }]}>Profile strength 50% · 0 connections yet</Text>
        </Tile>

        <Tile delay={490}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={[type.label, { color: t.amber }]}>UPCOMING ON CAMPUS</Text>
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12.5, color: t.amber }}>My events</Text>
          </View>
          <Marquee width={EVENTS.length * 210} duration={32000}>
            {EVENTS.map((e, k) => (
              <View key={e.n + k} style={{ width: 200, marginRight: 10, backgroundColor: t.panel2, borderColor: t.line2, borderWidth: 1, borderRadius: radius.nest, padding: 13 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.cats[e.i] }} />
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 10.5, letterSpacing: 1.2, color: t.cats[e.i] }}>{e.w.split(' · ')[0].toUpperCase()}</Text>
                </View>
                <Text numberOfLines={1} style={[type.body, { color: t.text, fontFamily: 'Outfit_600SemiBold' }]}>{e.n}</Text>
                <Text numberOfLines={1} style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: t.muted, marginTop: 3 }}>{e.w.split(' · ')[1]}</Text>
              </View>
            ))}
          </Marquee>
        </Tile>
      </ScrollView>
    </View>
  );
}

/** Card that fades and rises in on a stagger. */
function Tile({ children, delay = 0 }) {
  const { t } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 600, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <Card>{children}</Card>
    </Animated.View>
  );
}

/** Draws its line, then fades in the area beneath it. */
function Sparkline() {
  const { t } = useTheme();
  const line = 'M6 78 L60 70 L114 56 L168 58 L222 38 L294 14';
  const area = line + ' L294 88 L6 88 Z';
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, delay: 500, useNativeDriver: true }).start();
  }, []);
  return (
    <View style={{ height: 90 }}>
      <Animated.View style={{ opacity: fade, ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }) }}>
        <Svg width="100%" height={90} viewBox="0 0 300 90">
          <Defs>
            <SvgGrad id="spark" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.ramp[2]} stopOpacity="0.3" />
              <Stop offset="1" stopColor={t.ramp[2]} stopOpacity="0" />
            </SvgGrad>
          </Defs>
          <Path d={area} fill="url(#spark)" />
        </Svg>
      </Animated.View>
      <Svg width="100%" height={90} viewBox="0 0 300 90">
        <Path d={line} stroke={t.ramp[2]} strokeWidth={2.4} fill="none" />
        <Circle cx={294} cy={14} r={4} fill={t.text} />
      </Svg>
    </View>
  );
}
