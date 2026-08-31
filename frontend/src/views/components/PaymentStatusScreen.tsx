import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useTheme } from '@/src/theme/ThemeContext';

const OK = '#34D399';
const OK_TINT = 'rgba(52,211,153,.13)';
const OK_LINE = '#17503E';
const WARN = '#F5B342';
const WARN_TINT = 'rgba(245,179,66,.13)';
const WARN_LINE = '#4A3410';
const DANGER = '#F87186';
const DANGER_TINT = 'rgba(248,113,134,.12)';
const DANGER_LINE = '#5A1E2B';
const VIOLET_LT = '#A78BFA';
const VIOLET = '#7C5CFC';

const AnimatedCircle = Animated.createAnimatedComponent('circle');
const AnimatedPath = Animated.createAnimatedComponent('path');

export type PaymentResult = {
  mode: 'success' | 'failure';
  ticketId: string;
  eventName: string;
  attendeeName: string;
  type: string;
  amount: number;
  date: string;
  venue: string;
  email: string;
  slug?: string;
  time?: string;
  failedReason?: string;
  cardLast4?: string;
  errorCode?: string;
  holdTime?: string;
};

interface Props {
  result: PaymentResult;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onClose: () => void;
}

export default function PaymentStatusScreen({ result, onPrimaryAction, onSecondaryAction, onClose }: Props) {
  const { isDark } = useTheme();
  const bg = isDark ? '#08080F' : '#F4F5FA';
  const panel = isDark ? '#101019' : '#FFFFFF';
  const line = isDark ? '#1F1F30' : '#E4E6F0';
  const line2 = isDark ? '#292940' : '#D9DCEA';
  const muted = isDark ? '#9095A8' : '#565B70';
  const dim = isDark ? '#7E7E92' : '#6B7080';
  const text = isDark ? '#F4F4FA' : '#141726';

  const ok = result.mode === 'success';
  const accent = ok ? OK : DANGER;
  const accentTint = ok ? OK_TINT : DANGER_TINT;
  const accentLine = ok ? OK_LINE : DANGER_LINE;
  const accentText = ok ? '#04291D' : '#2A0710';
  const ribbonBg = ok
    ? 'linear-gradient(96deg, #0E9F6E, #34D399 62%, #2FB8C6)'
    : 'linear-gradient(96deg, #B31B38, #F87186 66%, #F0A6E8)';

  const arcAnim = useRef(new Animated.Value(0)).current;
  const markAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (ok) {
      Animated.sequence([
        Animated.timing(arcAnim, { toValue: 1, duration: 1100, useNativeDriver: false, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        Animated.timing(markAnim, { toValue: 1, duration: 500, useNativeDriver: false, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(arcAnim, { toValue: 1, duration: 1100, useNativeDriver: false, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        Animated.parallel([
          Animated.timing(markAnim, { toValue: 1, duration: 340, useNativeDriver: false, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ]),
      ]).start();
    }
  }, [arcAnim, markAnim, ok]);

  const arcDashoffset = arcAnim.interpolate({ inputRange: [0, 1], outputRange: ['327', '0'] });
  const markDashoffset = markAnim.interpolate({ inputRange: [0, 1], outputRange: ['76', '0'] });
  const mark2Dashoffset = markAnim.interpolate({ inputRange: [0, 1], outputRange: ['40', '0'] });

  if (Platform.OS !== 'web') return null as any;

  const eventName = result.eventName || 'this event';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}
      onClick={(e: any) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ maxWidth: 620, width: '100%', margin: 0, marginBottom: 30 }}>
        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, color: accent, marginBottom: 14 }}>
            {ok ? 'SUCCESS STATES' : 'FAILURE STATES'}
          </div>
          <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1.14, color: text }}>
            {ok ? 'Confirmation, at three weights' : 'Say what broke, and the way out'}
          </div>
          <div style={{ fontSize: '15.5px', lineHeight: 1.65, color: muted, marginTop: 10 }}>
            {ok
              ? 'A ribbon for page-level wins, a card for transactions, a toast for small ones. Each states what happened and what it unlocked.'
              : 'Never a bare code. Every failure names the cause, says whether money moved, and gives one clear next action.'}
          </div>
        </div>

        {/* Main Card */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${accentLine}`,
            borderRadius: 20,
            background: ok
              ? `linear-gradient(150deg, rgba(52,211,153,.11), ${panel} 62%)`
              : `linear-gradient(150deg, rgba(248,113,134,.09), ${panel} 62%)`,
            marginBottom: 20,
          }}
        >
          {/* Ribbon */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: ribbonBg,
              padding: '15px 26px',
            }}
          >
            <span style={{ position: 'absolute', top: '-30%', bottom: '-30%', width: '34%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)', pointerEvents: 'none' }} />
            <svg width="19" height="19" viewBox="0 0 24 24" style={{ fill: 'none', stroke: accentText, strokeWidth: 2.6, strokeLinecap: 'round', flexShrink: 0 }}>
              {ok ? (
                <path d="M5 12.5l4.5 4.5L19 7" />
              ) : (
                <>
                  <path d="M12 7v7M12 17.5v.01" />
                  <circle cx="12" cy="12" r="9.5" />
                </>
              )}
            </svg>
            <span style={{ position: 'relative', fontSize: '14.5px', fontWeight: 700, letterSpacing: '.2px', color: accentText, flex: 1, minWidth: 0 }}>
              {ok
                ? `Registration confirmed — you're on the ${eventName} list`
                : (result.failedReason || 'Payment declined — no money left your account')}
            </span>
            <span style={{ position: 'relative', fontSize: '11.5px', fontWeight: 700, letterSpacing: 1.2, color: accentText, whiteSpace: 'nowrap' }}>
              {ok ? 'SEP 04' : (result.errorCode || 'SA-ERR-7F31C9')}
            </span>
          </div>

          {/* Body */}
          <div style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', gap: 28, alignItems: 'center', padding: '32px 30px 34px' }}>
            {/* Animated Status Circle */}
            <div style={{ position: 'relative', width: 128, height: 128 }}>
              <svg width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="52" style={{ fill: accentTint, stroke: accentLine, strokeWidth: 2 }} />
                <AnimatedCircle
                  cx="64"
                  cy="64"
                  r="52"
                  style={{
                    fill: 'none',
                    stroke: accent,
                    strokeWidth: 3,
                    strokeLinecap: 'round',
                    strokeDasharray: '327',
                    strokeDashoffset: arcDashoffset,
                    transformOrigin: '64px 64px',
                    transform: [{ rotate: '-90deg' }],
                  }}
                />
                {ok ? (
                  <AnimatedPath
                    d="M44 66 L58 80 L86 50"
                    style={{
                      fill: 'none',
                      stroke: accent,
                      strokeWidth: 5.5,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeDasharray: '76',
                      strokeDashoffset: markDashoffset,
                    }}
                  />
                ) : (
                  <>
                    <AnimatedPath
                      d="M50 50 L78 78"
                      style={{
                        fill: 'none',
                        stroke: accent,
                        strokeWidth: 5.5,
                        strokeLinecap: 'round',
                        strokeDasharray: '40',
                        strokeDashoffset: markDashoffset,
                      }}
                    />
                    <AnimatedPath
                      d="M78 50 L50 78"
                      style={{
                        fill: 'none',
                        stroke: accent,
                        strokeWidth: 5.5,
                        strokeLinecap: 'round',
                        strokeDasharray: '40',
                        strokeDashoffset: mark2Dashoffset,
                      }}
                    />
                  </>
                )}
              </svg>
            </div>

            {/* Text Content */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-0.9px', color: text }}>
                {ok
                  ? `You're going to ${eventName}.`
                  : 'Your bank refused the charge.'}
              </div>
              <div style={{ fontSize: '14.5px', lineHeight: 1.65, color: muted, margin: '9px 0 18px' }}>
                {ok
                  ? (<>Ticket <strong style={{ color: text, fontWeight: 600 }}>{result.ticketId}</strong> is issued against your SA ID and sent to your college email. Free cancellation until Sep 1.</>)
                  : (<>Razorpay reported <strong style={{ color: text, fontWeight: 600 }}>{result.failedReason || 'insufficient funds'}</strong> on the card ending {result.cardLast4 || '4291'}. Your seat is held for 20 minutes while you retry.</>)}
              </div>

              {!ok && result.holdTime && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: WARN,
                    border: `1px solid ${WARN_LINE}`,
                    background: WARN_TINT,
                    borderRadius: '100px',
                    padding: '9px 15px',
                    marginBottom: 20,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4.5l3 1.8" />
                  </svg>
                  Seat released in <span style={{ color: text, minWidth: 42, display: 'inline-block' }}>{result.holdTime}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                {ok ? (
                  <>
                    <span
                      onClick={onPrimaryAction}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: '13.5px', fontWeight: 700, background: OK, color: '#04291D', borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}
                    >
                      View my ticket
                    </span>
                    {onSecondaryAction && (
                      <span
                        onClick={onSecondaryAction}
                        style={{ fontSize: '13.5px', fontWeight: 600, color: muted, border: `1px solid ${line2}`, borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}
                      >
                        Add to calendar
                      </span>
                    )}
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: muted, border: `1px solid ${line2}`, borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}>
                      Invite a friend
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      onClick={onPrimaryAction}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: '13.5px', fontWeight: 700, background: VIOLET, color: '#FFFFFF', borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                        <path d="M20 12a8 8 0 11-2.3-5.7M20 4v4h-4" />
                      </svg>
                      Try another card
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: muted, border: `1px solid ${line2}`, borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}>
                      Pay with UPI
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: muted, border: `1px solid ${line2}`, borderRadius: 11, padding: '12px 20px', cursor: 'pointer' }}>
                      Contact support
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Unlock footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: `1px solid ${line}`, background: 'rgba(8,8,15,.4)', padding: '15px 30px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: 1.5, color: dim, flexShrink: 0 }}>
              {ok ? 'THIS UNLOCKED' : 'NOTHING WAS LOST'}
            </span>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {ok ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '12.5px', fontWeight: 600, color: OK, background: OK_TINT, border: `1px solid ${OK_LINE}`, borderRadius: '100px', padding: '7px 13px' }}>+2 workshop passes</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '12.5px', fontWeight: 600, color: VIOLET_LT, background: 'rgba(124,92,252,.14)', border: '1px solid #2E2A55', borderRadius: '100px', padding: '7px 13px' }}>Recruiter access on campus</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '12.5px', fontWeight: 600, color: WARN, background: WARN_TINT, border: `1px solid ${WARN_LINE}`, borderRadius: '100px', padding: '7px 13px' }}>₹50,000 prize pool entry</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '12.5px', color: muted }}>Form answers saved</span>
                  <span style={{ color: dim }}>·</span>
                  <span style={{ fontSize: '12.5px', color: muted }}>Coupon still valid</span>
                  <span style={{ color: dim }}>·</span>
                  <span style={{ fontSize: '12.5px', color: muted }}>No charge on your statement</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mini cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {ok ? (
            <>
              <MiniCard iconColor={OK} iconBg={OK_TINT} iconBorder={OK_LINE} icon="check" ribbonColor={OK} title="Payment received" desc="₹599 via Razorpay. Invoice SA-INV-22981 is in My Tickets." theme={miniTheme(text, muted, panel, line2, OK, OK_TINT, OK_LINE)} />
              <MiniCard iconColor={VIOLET_LT} iconBg="rgba(124,92,252,.14)" iconBorder="#2E2A55" icon="user" ribbonColor={VIOLET_LT} title="Mentor accepted" desc="Rahul Sharma confirmed Thursday, 6:00 pm IST. Room link sent." theme={miniTheme(text, muted, panel, line2, VIOLET_LT, 'rgba(124,92,252,.14)', '#2E2A55')} />
              <MiniCard iconColor={WARN} iconBg={WARN_TINT} iconBorder={WARN_LINE} icon="warn" ribbonColor={WARN} title="Coupon claimed" desc="MRIT-MENTOR-40 applied. You saved ₹899 on this booking." theme={miniTheme(text, muted, panel, line2, WARN, WARN_TINT, WARN_LINE)} />
            </>
          ) : (
            <>
              <MiniCard iconColor={DANGER} iconBg={DANGER_TINT} iconBorder={DANGER_LINE} icon="alert" ribbonColor={DANGER} title="Event is full" desc="All 985 seats are taken. 41 people are on the waitlist ahead of you." theme={miniTheme(text, muted, panel, line2, DANGER, DANGER_TINT, DANGER_LINE)} />
              <MiniCard iconColor={WARN} iconBg={WARN_TINT} iconBorder={WARN_LINE} icon="warn" ribbonColor={WARN} title="Coupon expired" desc="SA-LEARN-40 ended on Jul 11. Two similar offers are live now." theme={miniTheme(text, muted, panel, line2, WARN, WARN_TINT, WARN_LINE)} />
              <MiniCard iconColor={VIOLET_LT} iconBg="rgba(124,92,252,.14)" iconBorder="#2E2A55" icon="shield" ribbonColor={VIOLET_LT} title="Verification pending" desc="Your college email is unconfirmed, so student pricing is not applied yet." theme={miniTheme(text, muted, panel, line2, VIOLET_LT, 'rgba(124,92,252,.14)', '#2E2A55')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function miniTheme(text: string, muted: string, panel: string, line2: string, color: string, tint: string, line: string) {
  return { text, muted, panel, line2, color, tint, line };
}

function MiniCard({ iconColor, iconBg, iconBorder, icon, ribbonColor, title, desc, theme }: {
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  icon: string;
  ribbonColor: string;
  title: string;
  desc: string;
  theme: any;
}) {
  const iconPath = {
    check: 'M5 12.5l4 4 10-10.5',
    warn: 'M12 4l9 16H3ZM12 10v4M12 17v.01',
    alert: 'M4 4l16 16M20 4l-16 16',
    user: <><circle cx="9" cy="9" r="3.2" /><path d="M3 19q6-6 12 0M18 8v6M15 11h6" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" /><path d="M12 9v3.5M12 15.5v.01" /></>,
  }[icon];

  const secondaryText = theme.color;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${theme.line2}`, borderRadius: 18, background: theme.panel, padding: '22px 24px 24px' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: `linear-gradient(90deg, ${ribbonColor}, ${ribbonColor})`, transformOrigin: 'left' }} />
      <span style={{ width: 40, height: 40, borderRadius: 12, background: theme.tint, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: iconColor, strokeWidth: 2.4, strokeLinecap: 'round' }}>
          {typeof iconPath === 'string' ? <path d={iconPath} /> : iconPath}
        </svg>
      </span>
      <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-0.3px', color: theme.text }}>{title}</div>
      <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: theme.muted, margin: '7px 0 14px' }}>{desc}</div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 700, color: secondaryText, cursor: 'pointer' }}>
        View →
      </span>
    </div>
  );
}
