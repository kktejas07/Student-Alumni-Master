import React, { useState } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { ThemeProvider, useTheme, radius } from './theme';
import LandingScreen from './screens/LandingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';

const TABS = [
  { k: 'landing', label: 'Landing', C: LandingScreen },
  { k: 'onboarding', label: 'Onboarding', C: OnboardingScreen },
  { k: 'dashboard', label: 'Dashboard', C: DashboardScreen }
];

function Shell() {
  const { t } = useTheme();
  const [tab, setTab] = useState('dashboard');
  const Active = (TABS.find((x) => x.k === tab) || TABS[0]).C;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={t.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1 }}><Active /></View>
      <View style={{ flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 28, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.panel }}>
        {TABS.map((x) => {
          const on = x.k === tab;
          return (
            <Pressable key={x.k} onPress={() => setTab(x.k)} style={{
              flex: 1, alignItems: 'center', paddingVertical: 11,
              borderRadius: radius.ctl, backgroundColor: on ? t.tintStrong : 'transparent'
            }}>
              <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: on ? t.onTint : t.muted }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#08080F' }} />;
  return (
    <ThemeProvider initial="dark">
      <Shell />
    </ThemeProvider>
  );
}
