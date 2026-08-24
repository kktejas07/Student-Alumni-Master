/**
 * HeroIllustration.tsx
 *
 * Mountain summit illustration with a glowing indigo path leading to a peak flag
 * under a starry dark night sky with nebula ambient backdrops.
 * Matches Image 1 reference design.
 */
import React, { memo } from 'react';
import {View, StyleSheet} from "react-native";
import Svg, {
  Circle, Line, Defs, RadialGradient, LinearGradient as SvgLinearGradient,
  Stop, Path, Polygon
} from 'react-native-svg';
import { COLORS, RADIUS } from '@/src/lib/designTokens';

export const HeroIllustration = memo(function HeroIllustration() {
  return (
    <View style={styles.container} aria-hidden={true}>
      <Svg width={320} height={200} viewBox="0 0 320 200">
        <Defs>
          {/* Deep sky nebula gradient */}
          <RadialGradient id="skyNebula" cx="65%" cy="30%" r="60%">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity={0.45} />
            <Stop offset="50%" stopColor="#312E81" stopOpacity={0.20} />
            <Stop offset="100%" stopColor="#0B0D1A" stopOpacity={0} />
          </RadialGradient>

          {/* Summit flag glow */}
          <RadialGradient id="summitGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#A5B4FC" stopOpacity={0.9} />
            <Stop offset="50%" stopColor="#6366F1" stopOpacity={0.4} />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
          </RadialGradient>

          {/* Path glowing gradient */}
          <SvgLinearGradient id="pathGradient" x1="0" y1="1" x2="0.8" y2="0">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity={0.7} />
            <Stop offset="40%" stopColor="#818CF8" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#A5B4FC" stopOpacity={1.0} />
          </SvgLinearGradient>

          {/* Mountain gradients */}
          <SvgLinearGradient id="mountainBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E1B4B" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#0F172A" stopOpacity={0.95} />
          </SvgLinearGradient>
          <SvgLinearGradient id="mountainFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E1B4B" stopOpacity={0.95} />
            <Stop offset="100%" stopColor="#090D16" stopOpacity={1.0} />
          </SvgLinearGradient>
        </Defs>

        {/* Background nebula */}
        <Circle cx="210" cy="70" r="90" fill="url(#skyNebula)" />

        {/* Stars */}
        <Circle cx="40" cy="30" r="1.2" fill="#fff" opacity={0.6} />
        <Circle cx="80" cy="45" r="1.5" fill="#A5B4FC" opacity={0.8} />
        <Circle cx="130" cy="20" r="1" fill="#fff" opacity={0.5} />
        <Circle cx="170" cy="40" r="1.8" fill="#38BDF8" opacity={0.7} />
        <Circle cx="240" cy="25" r="1.2" fill="#fff" opacity={0.9} />
        <Circle cx="280" cy="50" r="1.5" fill="#818CF8" opacity={0.8} />

        {/* Constellation lines */}
        <Line x1="80" y1="45" x2="130" y2="20" stroke="rgba(165,180,252,0.25)" strokeWidth="0.8" strokeDasharray="3 3" />
        <Line x1="170" y1="40" x2="240" y2="25" stroke="rgba(56,189,248,0.25)" strokeWidth="0.8" strokeDasharray="3 3" />

        {/* Distant background mountain peak */}
        <Polygon points="20,200 90,110 160,200" fill="url(#mountainBack)" />

        {/* Main foreground mountain range */}
        <Polygon points="60,200 210,45 310,200" fill="url(#mountainFront)" />
        <Polygon points="160,200 260,105 320,200" fill="url(#mountainBack)" opacity={0.7} />

        {/* Mountain ridge line highlight */}
        <Path d="M60 200 L210 45 L310 200" stroke="rgba(129,140,248,0.2)" strokeWidth="1" fill="none" />

        {/* Glowing winding path up the mountain */}
        <Path
          d="M 50 195 Q 90 170 110 155 T 150 120 T 175 85 T 210 45"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Outer path glow */}
        <Path
          d="M 50 195 Q 90 170 110 155 T 150 120 T 175 85 T 210 45"
          fill="none"
          stroke="#6366F1"
          strokeWidth="8"
          strokeOpacity={0.3}
          strokeLinecap="round"
        />

        {/* Path milestone dots */}
        <Circle cx="80" cy="172" r="3.5" fill="#38BDF8" />
        <Circle cx="125" cy="140" r="4" fill="#818CF8" />
        <Circle cx="165" cy="100" r="4" fill="#818CF8" />

        {/* Summit peak glow aura */}
        <Circle cx="210" cy="45" r="24" fill="url(#summitGlow)" />

        {/* Summit Flagpole */}
        <Line x1="210" y1="45" x2="210" y2="20" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />

        {/* Summit Flag */}
        <Path d="M 210 20 L 232 27 L 210 34 Z" fill="#818CF8" />
        <Path d="M 210 20 L 232 27 L 210 34 Z" fill="none" stroke="#EEF2FF" strokeWidth="1" />

        {/* Summit star sparkles */}
        <Circle cx="210" cy="18" r="2.5" fill="#FFF" />
        <Path d="M 238 22 L 239.5 25 L 242.5 26.5 L 239.5 28 L 238 31 L 236.5 28 L 233.5 26.5 L 236.5 25 Z" fill="#F472B6" opacity={0.9} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    borderRadius: RADIUS.card,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});
