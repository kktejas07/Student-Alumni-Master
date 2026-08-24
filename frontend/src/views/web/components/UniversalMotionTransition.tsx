// @ts-nocheck
/**
 * UniversalMotionTransition — Universal page/view motion slide transition of 100px.
 * 
 * Provides:
 * 1. <UniversalMotionTransition /> - React Native & Web component animating translateY 100 -> 0 and opacity 0 -> 1.
 * 2. <MotionSlideWrapper /> - Slide in from 100px with spring/cubic easing.
 * 3. Global CSS injection for web route transitions.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Platform } from 'react-native';
import { GlobalTopProgressBar } from './AppLoader';

export interface MotionTransitionProps {
  children: React.ReactNode;
  deps?: any[];
  offset?: number; // default 100
  duration?: number; // default 350ms
  direction?: 'up' | 'down' | 'left' | 'right';
  showProgressBar?: boolean;
  style?: any;
}

export function UniversalMotionTransition({
  children,
  deps = [],
  offset = 100,
  duration = 350,
  direction = 'up',
  showProgressBar = true,
  style,
}: MotionTransitionProps) {
  const isHorizontal = direction === 'left' || direction === 'right';
  const initialOffset = (direction === 'down' || direction === 'right') ? -offset : offset;
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateVal = useRef(new Animated.Value(initialOffset)).current;
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setNavigating(true);
    opacity.setValue(0);
    translateVal.setValue(initialOffset);

    // Easing: cubic bezier smooth decel (equivalent to cubic-bezier(0.16, 1, 0.3, 1))
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateVal, {
        toValue: 0,
        duration: duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setNavigating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const transformStyle = isHorizontal
    ? [{ translateX: translateVal }]
    : [{ translateY: translateVal }];

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: transformStyle,
        },
      ]}
    >
      {showProgressBar && <GlobalTopProgressBar active={navigating} />}
      {children}
    </Animated.View>
  );
}

// Inject global web keyframe styles once on client
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sa-motion-slide-100-styles';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.innerHTML = `
      @keyframes saMotionSlide100 {
        0% {
          opacity: 0;
          transform: translateY(100px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes saMotionSlideX100 {
        0% {
          opacity: 0;
          transform: translateX(100px);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .sa-motion-slide-100 {
        animation: saMotionSlide100 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        will-change: transform, opacity;
      }
      .sa-motion-slide-x-100 {
        animation: saMotionSlideX100 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

const styles = {
  container: {
    flex: 1,
    width: '100%',
  },
} as const;
