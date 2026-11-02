// the 5 self-contained sub-components (watermark, scroll counter, marquee, hover-lift card, glow button) — split verbatim from LandingPage.tsx (audit Step 6b).
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

/* ── Subtle Right-Side SA Logo Background Watermark (Non-Landing Pages) ── */
export function BackgroundWatermark({ visible }: { visible: boolean }) {
  return null;
  if (!visible) return null;
  return <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />;
}

/* ── Scroll-Triggered Animated Number Counter Component ── */
export function ScrollCounter({
  target,
  suffix = '',
  trigger = true,
  style,
}: {
  target: number;
  suffix?: string;
  trigger?: boolean;
  style?: any;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime: number | null = null;
    const duration = 1600;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setDisplayValue(target);
      }
    };

    const handle = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(handle);
  }, [target, trigger]);

  return <Text style={style}>{displayValue.toLocaleString('en-IN')}{suffix}</Text>;
}

/* ── Pure Continuous Smooth Marquee Component ── */
export function Marquee({
  items,
  duration = 36,
  reverse = false,
}: {
  items: string[];
  duration?: number;
  reverse?: boolean;
}) {
  const { isDark } = useTheme();
  const mqText = isDark ? '#F4F5FB' : '#1D1D1F';

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '8px 12px',
    marginRight: '14px',
    height: '72px',
    width: '150px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '11.5px',
    fontWeight: 700,
    color: mqText,
    letterSpacing: '0.2px',
  };

  const renderItem = (item: string, key: string) => (
    <div key={key} style={cardStyle}>
      {item.startsWith('/') ? (
        <img
          src={item}
          alt={item}
          style={{
            width: '100px',
            height: '60px',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      ) : (
        <span>{item}</span>
      )}
    </div>
  );

  return (
    <View style={{ overflow: 'hidden', flex: 1 }}>
      <div
        className={reverse ? 'sa-mq-wrap-r' : 'sa-mq-wrap-l'}
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 'max-content',
          animationDuration: `${duration}s`,
        }}
      >
        {/* 4 identical sets — animation translates -25% (= 1 set) for a seamless gapless loop */}
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => renderItem(item, `s1-${idx}`))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => renderItem(item, `s2-${idx}`))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => renderItem(item, `s3-${idx}`))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => renderItem(item, `s4-${idx}`))}
        </div>
      </div>
    </View>
  );
}


/* ── Interactive 3D Card Component with 3D Tilt & Physics ── */
export function HoverLiftCard({
  children,
  style,
  hoverBorderColor = '#5B4FE9',
  enableTilt = true,
}: {
  children: React.ReactNode;
  style?: any;
  hoverBorderColor?: string;
  enableTilt?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setTiltStyle(`perspective(1000px) rotateY(${(dx * 4.5).toFixed(2)}deg) rotateX(${(-dy * 4.5).toFixed(2)}deg) translateY(-6px)`);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTiltStyle('perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)');
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        transition: hovered
          ? 'transform 0.1s ease-out, border-color 0.3s ease, box-shadow 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.2, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
        transform: hovered && tiltStyle ? tiltStyle : 'translateY(0px)',
        cursor: 'pointer',
        willChange: 'transform',
      }}
    >
      <View
        style={[
          style,
          {
            flex: 1,
            width: '100%',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          } as any,
          hovered && {
            borderColor: hoverBorderColor,
            shadowColor: '#5B4FE9',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.35,
            shadowRadius: 32,
          },
        ]}
      >
        {children}
      </View>
    </div>
  );
}

/* ── Interactive Button with Hover Lift & Glow ── */
export function GlowButton({
  onPress,
  children,
  style,
  textStyle,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        style,
        {
          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        } as any,
        hovered && {
          transform: [{ translateY: -3 }],
          filter: 'brightness(1.18)',
          shadowColor: '#5B4FE9',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.55,
          shadowRadius: 24,
        },
      ]}
    >
      {typeof children === 'string' ? <Text style={textStyle}>{children}</Text> : children}
    </Pressable>
  );
}
