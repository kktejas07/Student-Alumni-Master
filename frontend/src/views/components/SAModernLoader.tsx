import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import Svg, { Path, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

export function SAModernLoader({
  subtitle = 'LOADING',
  onFinished,
  isOverlay = false,
}: {
  subtitle?: string;
  onFinished?: () => void;
  isOverlay?: boolean;
}) {
  // On Web, NEVER render the blocking full-screen splash overlay — render null so pages load immediately
  if (Platform.OS === 'web') {
    if (onFinished) {
      setTimeout(onFinished, 0);
    }
    return null;
  }

  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let current = 0;
    const iv = setInterval(() => {
      current += Math.floor(Math.random() * 16) + 12;
      if (current >= 100) {
        setCount(100);
        clearInterval(iv);

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateYAnim, {
              toValue: -900,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setVisible(false);
            if (onFinished) onFinished();
          });
        }, 60);
      } else {
        setCount(current);
      }
    }, 28);

    const safety = setTimeout(() => {
      clearInterval(iv);
      setCount(100);
      setVisible(false);
      if (onFinished) onFinished();
    }, 1500);

    return () => {
      clearInterval(iv);
      clearTimeout(safety);
    };
  }, [onFinished, translateYAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        isOverlay ? styles.overlayShell : styles.shell,
        {
          transform: [{ translateY: translateYAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={count >= 100 ? 'none' : 'auto'}
    >
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.center}>
        <Svg viewBox="0 0 300 350" width={92} height={108} style={{ marginBottom: 20 }}>
          <Defs>
            <SvgGrad id="saLoaderShieldGradNative" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#D8B6FF" />
              <Stop offset="0.45" stopColor="#9A5CE8" />
              <Stop offset="1" stopColor="#5B1FB0" />
            </SvgGrad>
          </Defs>
          <Path
            d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
            fill="url(#saLoaderShieldGradNative)"
          />
          <Path
            d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z"
            fill="#05060F"
            fillOpacity="0.75"
          />
          <SvgText
            x="150"
            y="215"
            textAnchor="middle"
            fontFamily="'DM Sans', sans-serif"
            fontSize="128"
            fontWeight="800"
            fill="#FFFFFF"
          >
            SA
          </SvgText>
        </Svg>

        <Text style={styles.counterText}>
          {count.toString().padStart(2, '0')}
        </Text>

        <Text style={styles.tag}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#05060D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlayShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: '#05060D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(139, 90, 255, 0.35)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 10,
  },
  counterText: {
    fontSize: 76,
    fontWeight: '800',
    color: '#8B84FF',
    letterSpacing: -3,
    lineHeight: 80,
  },
  tag: {
    color: '#9AA0B4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
