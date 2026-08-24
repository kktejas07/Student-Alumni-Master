import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radius, space, type } from '../theme';
import { Btn, Card, Pill, Marquee, Counter } from '../components/ui';

const PARTNERS = ['SREENIDHI', 'VNRVJIT', 'CDC', 'KITS KHAMMAM', 'AWFIS', 'REVV', 'COLIVE', '91SPRINGBOARD'];

const FEATURES = [
  { k: 'Agent K', d: 'Runs multi-step career tasks for you — referrals, resume passes, application batches.', i: 0 },
  { k: 'AI Roadmap', d: 'A term-by-term plan that rebuilds itself as your skills and goals move.', i: 1 },
  { k: 'Verified mentors', d: 'Alumni at Google, Microsoft, Amazon, AWS and Adobe with real session capacity.', i: 5 },
  { k: 'Campus network', d: 'Events, workshops and showcases from your own institution and its partners.', i: 4 }
];

export default function LandingScreen() {
  const { t, toggle } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true })
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 24000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 24000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    ])).start();
  }, []);

  const drift = glow.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg2 }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -80, top: -120, width: 460, height: 460, transform: [{ translateX: drift }] }}>
        <LinearGradient colors={[t.glow[0], 'transparent']} style={{ flex: 1, borderRadius: 230 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <LinearGradient colors={[t.accentLt, t.accent]} style={{ width: 30, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 13, color: '#FFFFFF' }}>SA</Text>
            </LinearGradient>
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.text }}>StudentAlumni</Text>
          </View>
          <Btn variant="ghost" onPress={toggle}>{t.name === 'dark' ? 'Light' : 'Dark'}</Btn>
        </View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], paddingHorizontal: 20, paddingTop: 40 }}>
          <Pill tone="accent">AI CAREER COMPANION</Pill>
          <Text style={[type.display, { color: t.text, marginTop: 18 }]}>
            Your degree opens{'\n'}the door.{' '}
            <Text style={{ color: t.accentLt }}>We walk you{'\n'}through it.</Text>
          </Text>
          <Text style={[type.body, { color: t.muted, marginTop: 16, maxWidth: 460 }]}>
            Verified mentors, a roadmap that rebuilds itself, and every campus opportunity in one place.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
            <Btn style={{ flex: 1 }}>Get started free</Btn>
            <Btn variant="ghost" style={{ flex: 1 }}>See how it works</Btn>
          </View>

          <View style={{ flexDirection: 'row', gap: 26, marginTop: 34 }}>
            {[['Students', 12400], ['Mentors', 860], ['Colleges', 42]].map(([k, v]) => (
              <View key={k}>
                <Counter value={v} suffix="+" />
                <Text style={[type.meta, { color: t.muted, marginTop: 4 }]}>{k}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ marginTop: 44, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.line }}>
          <Marquee width={PARTNERS.length * 150}>
            {PARTNERS.map((p, i) => (
              <Text key={p + i} style={{ fontFamily: 'Manrope_700Bold', fontSize: 13, letterSpacing: 1.6, color: t.muted, width: 150 }}>{p}</Text>
            ))}
          </Marquee>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 44, gap: space.md }}>
          <Text style={[type.h1, { color: t.text, marginBottom: 6 }]}>Four things it does well</Text>
          {FEATURES.map((f, idx) => (
            <FeatureCard key={f.k} {...f} delay={idx * 70} />
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 46 }}>
          <Card tinted>
            <Text style={[type.h2, { color: t.text }]}>Ready when you are</Text>
            <Text style={[type.body, { color: t.muted, marginTop: 8, marginBottom: 20 }]}>
              Free for verified students. Your college email is the only thing you need.
            </Text>
            <Btn>Create your account</Btn>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 46 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[type.body, { color: t.muted }]}>Build with love for student</Text>
            <Text style={{ color: t.accentLt, fontSize: 14 }}>♥</Text>
          </View>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 26, letterSpacing: -0.6, color: t.text, marginTop: 10 }}>#studentaumni</Text>
          <Text style={[type.meta, { color: t.muted, marginTop: 14 }]}>All right are recived @ Studt Alumni 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureCard({ k, d, i, delay }) {
  const { t } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 600, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, []);
  const col = t.cats[i];
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <Card>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: col + '26', marginBottom: 14 }} />
        <Text style={[type.h3, { color: t.text }]}>{k}</Text>
        <Text style={[type.body, { color: t.muted, marginTop: 6 }]}>{d}</Text>
      </Card>
    </Animated.View>
  );
}
