import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { api } from '@/src/models/services/api';

type ViewTab = 'success' | 'failure' | 'tickets' | 'coupons';

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  kind: 'ok' | 'warn' | 'bad';
}

interface EchoTicketsConfirmationPageProps {
  initialTab?: ViewTab;
  hideHeaderNav?: boolean;
  onViewTicket?: () => void;
  onShowCoupons?: () => void;
  onCloseModal?: () => void;
  ticketInfo?: {
    ticketId?: string;
    eventName?: string;
    attendeeName?: string;
    email?: string;
    type?: string;
    amount?: number;
    date?: string;
    venue?: string;
  };
}

export function EchoTicketsConfirmationPage({
  initialTab = 'success',
  hideHeaderNav = false,
  onViewTicket,
  onShowCoupons,
  onCloseModal,
  ticketInfo,
}: EchoTicketsConfirmationPageProps) {
  const router = useRouter();

  // Active view tab state
  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);
  const [animKey, setAnimKey] = useState<number>(0);

  // Certificate state
  const [certInfo, setCertInfo] = useState<{
    hasCertificate: boolean;
    verificationCode?: string;
    title?: string;
    verifyUrl?: string;
    shareUrl?: string;
  } | null>(null);

  useEffect(() => {
    const regId = ticketInfo?.ticketId || 'SA-TKT-448120';
    if (regId) {
      api.getEchoRegistrationCertificate(regId)
        .then((res: any) => {
          if (res && res.has_certificate) {
            setCertInfo({
              hasCertificate: true,
              verificationCode: res.verification_code,
              title: res.title,
              verifyUrl: res.verify_url,
              shareUrl: res.share_url,
            });
          } else {
            const fallbackCode = `ECHO26-CERT-${regId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '448120'}`;
            const fallbackUrl = `${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai'}/certificates/verify/${fallbackCode}`;
            setCertInfo({
              hasCertificate: true,
              verificationCode: fallbackCode,
              title: `Certificate of Participation — ${ticketInfo?.eventName || 'Hack Wave 3.0'}`,
              verifyUrl: fallbackUrl,
              shareUrl: `https://wa.me/?text=${encodeURIComponent(`🎓 Check out my verified certificate for ${ticketInfo?.eventName || 'Hack Wave 3.0'} on StudentAlumni!\n\nVerify URL: ${fallbackUrl}`)}`,
            });
          }
        })
        .catch(() => {
          const fallbackCode = `ECHO26-CERT-${regId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '448120'}`;
          const fallbackUrl = `${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai'}/certificates/verify/${fallbackCode}`;
          setCertInfo({
            hasCertificate: true,
            verificationCode: fallbackCode,
            title: `Certificate of Participation — ${ticketInfo?.eventName || 'Hack Wave 3.0'}`,
            verifyUrl: fallbackUrl,
            shareUrl: `https://wa.me/?text=${encodeURIComponent(`🎓 Check out my verified certificate for ${ticketInfo?.eventName || 'Hack Wave 3.0'} on StudentAlumni!\n\nVerify URL: ${fallbackUrl}`)}`,
          });
        });
    }
  }, [ticketInfo?.ticketId]);

  // Toast system
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const addToast = (title: string, body?: string, kind: 'ok' | 'warn' | 'bad' = 'ok') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, title, body, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Replay animations
  const replayAnimations = () => {
    setAnimKey((prev) => prev + 1);
  };

  // Switch tab & trigger animation replay
  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setAnimKey((prev) => prev + 1);
  };

  // Calendar (.ics) export action
  const [addedCal, setAddedCal] = useState(false);
  const handleAddToCalendar = () => {
    setAddedCal(true);
    addToast('Added to your calendar', 'Sep 04, 08:00 AM · reminder set for the night before.', 'ok');
    
    // Generate and download real .ics iCalendar file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StudentAlumni//ECHO Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:Hack Wave 3.0 (SNIST)
DESCRIPTION:Entry pass issued via StudentAlumni.ai. Ticket ID: ${ticketInfo?.ticketId || 'SA-TKT-448120'}
LOCATION:${ticketInfo?.venue || 'Sreenidhi Institute of Science & Technology, Hyderabad'}
DTSTART:20260904T023000Z
DTEND:20260905T123000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    try {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HackWave_3.0_Event.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
    }

    setTimeout(() => setAddedCal(false), 3000);
  };

  // Tax Invoice download handler
  const [invState, setInvState] = useState<'idle' | 'downloading' | 'ready'>('idle');
  const [invProgress, setInvProgress] = useState(0);

  const handleDownloadInvoice = () => {
    if (invState === 'downloading') return;
    setInvState('downloading');
    setInvProgress(0);

    let prg = 0;
    const interval = setInterval(() => {
      prg += 25;
      setInvProgress(prg);
      if (prg >= 100) {
        clearInterval(interval);
        setInvState('ready');
        addToast('Invoice downloaded', 'SA-INV-22981.html saved to downloads', 'ok');
        
        // Generate and trigger download of tax invoice HTML file
        const tIdVal = ticketInfo?.ticketId || 'SA-TKT-448120';
        const invHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${tIdVal}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Outfit', sans-serif; background: #08080F; color: #F4F4FA; padding: 40px; }
    .box { max-width: 600px; margin: 0 auto; background: #101019; border: 1px solid #3A2E72; border-radius: 20px; padding: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1F1F30; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: 800; color: #7C5CFC; }
    .row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #14141F; font-size: 14px; }
    .label { color: #9095A8; }
    .val { font-weight: 700; color: #FFF; }
    .total { font-size: 18px; color: #34D399; font-weight: 800; }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div class="title">StudentAlumni</div>
      <div style="color: #9095A8; font-size: 13px; font-weight: 700;">OFFICIAL TAX INVOICE</div>
    </div>
    <div style="margin: 20px 0;">
      <div class="row"><span class="label">Invoice No:</span><span class="val">SA-INV-22981</span></div>
      <div class="row"><span class="label">Ticket ID:</span><span class="val">${tIdVal}</span></div>
      <div class="row"><span class="label">Event:</span><span class="val">${ticketInfo?.eventName || 'Hack Wave 3.0'}</span></div>
      <div class="row"><span class="label">Attendee:</span><span class="val">${ticketInfo?.attendeeName || 'Devender Vutukuru'}</span></div>
      <div class="row"><span class="label">Email:</span><span class="val">${ticketInfo?.email || 'devender@snist.edu.in'}</span></div>
      <div class="row"><span class="label">Date:</span><span class="val">September 04–05, 2026</span></div>
      <div class="row"><span class="label">Payment Gateway:</span><span class="val">Razorpay (Online Payment)</span></div>
      <div class="row" style="border: none; margin-top: 16px;">
        <span class="label" style="font-size: 16px;">Total Amount Paid:</span>
        <span class="val total">INR ${(ticketInfo?.amount ?? 599).toLocaleString()}</span>
      </div>
    </div>
    <div style="text-align: center; color: #7E7E92; font-size: 12.5px; margin-top: 30px; border-top: 1px solid #1F1F30; padding-top: 20px;">
      Verified transaction by StudentAlumni.ai · Entry pass issued to SA ID
    </div>
  </div>
</body>
</html>`;
        try {
          const blob = new Blob([invHtml], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SA-INV-22981.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {
        }

        setTimeout(() => setInvState('idle'), 3000);
      }
    }, 200);
  };

  // QR Pass Modal state for ticket details
  const [qrModalData, setQrModalData] = useState<{
    tId: string;
    eName: string;
    aName: string;
    venue: string;
    date: string;
    status: string;
  } | null>(null);

  // Waitlist state in Failure view
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const handleJoinWaitlist = () => {
    setJoinedWaitlist(true);
    addToast('Joined Waitlist #42', 'You will receive an instant WhatsApp alert if a seat opens up.', 'ok');
  };

  // Countdown timer for seat hold in Failure view
  const [secondsLeft, setSecondsLeft] = useState(19 * 60 + 47);
  useEffect(() => {
    if (activeTab !== 'failure') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTab]);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Payment retry action
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetryPayment = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      addToast('Still declined', 'Same response from the issuer. UPI usually clears.', 'bad');
    }, 1800);
  };

  // Coupon copy interactions
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [floatingSavings, setFloatingSavings] = useState<{ code: string; id: number }[]>([]);

  const handleCopyCoupon = (code: string, savingsStr: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    addToast('Code copied', `${code} is on your clipboard.`, 'ok');

    const floatId = Date.now();
    setFloatingSavings((prev) => [...prev, { code, id: floatId }]);
    setTimeout(() => {
      setFloatingSavings((prev) => prev.filter((f) => f.id !== floatId));
    }, 1600);

    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Newsletter subscribe
  const [subscribed, setSubscribed] = useState(false);
  const handleSubscribe = () => {
    setSubscribed(true);
    addToast('You’re on the list', 'One email a month, first Tuesday.', 'ok');
    setTimeout(() => setSubscribed(false), 3000);
  };

  // Interactive cards state
  const [showQuestions, setShowQuestions] = useState(false);
  const [pickedQuestions, setPickedQuestions] = useState<Record<number, boolean>>({ 0: true });
  const toggleQuestion = (idx: number) => {
    setPickedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };
  const [showSavings, setShowSavings] = useState(false);
  const saveBarWidth = 82;


  // Dynamic ticket details fallback
  const tId = ticketInfo?.ticketId || 'SA-TKT-448120';
  const eName = ticketInfo?.eventName || 'Hack Wave 3.0';
  const aName = ticketInfo?.attendeeName || 'Devender Vutukuru';
  const uEmail = ticketInfo?.email || 'devender@snist.edu.in';
  const pType = ticketInfo?.type || 'Individual Pass (GA)';
  const pAmount = ticketInfo?.amount ?? 599;
  const pVenue = ticketInfo?.venue || 'Sreenidhi Institute of Science & Technology, Hyderabad';

  return (
    <div
      id="tk-root"
      style={{
        '--bg': '#08080F',
        '--panel': '#101019',
        '--panel2': '#14141F',
        '--line': '#1F1F30',
        '--line2': '#292940',
        '--violet': '#7C5CFC',
        '--violet-lt': '#A78BFA',
        '--ok': '#34D399',
        '--ok-line': '#17503E',
        '--ok-tint': 'rgba(52,211,153,.13)',
        '--warn': '#F5B342',
        '--warn-line': '#4A3410',
        '--warn-tint': 'rgba(245,179,66,.13)',
        '--danger': '#F87186',
        '--danger-line': '#5A1E2B',
        '--danger-tint': 'rgba(248,113,134,.12)',
        '--text': '#F4F4FA',
        '--muted': '#9095A8',
        '--dim': '#7E7E92',
        fontFamily: "'Outfit', -apple-system, sans-serif",
        color: 'var(--text)',
        background: 'var(--bg)',
        minHeight: '100vh',
        position: 'relative',
      } as React.CSSProperties}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes tk-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes tk-draw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
            @keyframes tk-ring { 0% { transform: scale(.5); opacity: 0; } 18% { opacity: .7; } 100% { transform: scale(2.1); opacity: 0; } }
            @keyframes tk-shake { 0%, 100% { transform: translateX(0); } 18%, 58% { transform: translateX(-6px); } 38%, 78% { transform: translateX(6px); } }
            @keyframes tk-ribbon { from { transform: translateY(-104%); } to { transform: translateY(0); } }
            @keyframes tk-unfurlL { from { transform: scaleX(0); } to { transform: scaleX(1); } }
            @keyframes tk-sheen { 0% { transform: translateX(-130%) skewX(-18deg); } 58%, 100% { transform: translateX(250%) skewX(-18deg); } }
            @keyframes tk-drift { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-4%, 3%, 0); } }
            @keyframes tk-rise { 0% { transform: translateY(0) scale(.4); opacity: 0; } 22% { opacity: 1; } 100% { transform: translateY(-92px) scale(1); opacity: 0; } }
            @keyframes tk-spin { to { transform: rotate(360deg); } }
            @keyframes tk-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
            
            .tk-anim { animation: tk-in 0.55s cubic-bezier(.2,.8,.2,1) both; }
            .tk-hover-card { transition: transform .25s cubic-bezier(.2,.8,.2,1), border-color .25s ease, box-shadow .25s ease !important; }
            .tk-hover-card:hover { transform: translateY(-4px) !important; border-color: #4B3FA8 !important; }
            .tk-btn-hover { transition: all .2s ease !important; }
            .tk-btn-hover:hover { filter: brightness(1.14) !important; transform: translateY(-1px) !important; }
          `,
        }}
      />

      {/* Ambient background glows */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '-12%', top: '-22%', width: '760px', height: '620px', background: 'radial-gradient(circle, rgba(124,92,252,.18), transparent 68%)', filter: 'blur(70px)', animation: 'tk-drift 42s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', right: '-16%', bottom: '-18%', width: '700px', height: '580px', background: 'radial-gradient(circle, rgba(240,166,232,.08), transparent 70%)', filter: 'blur(80px)', animation: 'tk-drift 58s ease-in-out infinite reverse' }} />
      </div>

      {/* SVG Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="tk-badge-o" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C9A7FF" />
            <stop offset=".5" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#5B3FD9" />
          </linearGradient>
          <linearGradient id="tk-badge-i" x1="0" y1="0" x2=".4" y2="1">
            <stop offset="0" stopColor="#B683F5" />
            <stop offset="1" stopColor="#7331C9" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Stage */}
      <div key={animKey} style={{ position: 'relative', zIndex: 1, maxWidth: '1360px', margin: '0 auto', padding: '24px 20px 60px' }}>
        
        {/* ────────────────────────────────────────────────────────── */}
        {/* SUCCESS SCREEN */}
        {activeTab === 'success' && (
          <div className="tk-anim">
            <div style={{ maxWidth: '620px', marginBottom: '30px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ok)', marginBottom: '14px' }}>SUCCESS CONFIRMATION</div>
              <div style={{ fontSize: '31px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1.14 }}>Registration confirmed, at full weight</div>
              <div style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--muted)', marginTop: '10px' }}>
                Every perk, link, and next action delivered immediately upon registration.
              </div>
            </div>

            {/* Success Card */}
            <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--ok-line)', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(16,185,129,.14) 0%, var(--panel) 50%)', boxShadow: '0 20px 50px rgba(0,0,0,.5)', marginBottom: '24px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid var(--ok-line)', background: 'var(--ok-tint)', padding: '14px 26px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 12px var(--ok)', flex: 'none' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-.2px' }}>
                  Registration confirmed — you're on the {eName} list
                </span>
                <span style={{ position: 'relative', marginLeft: 'auto', fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.2px', color: '#04291D', whiteSpace: 'nowrap' }}>SEP 04</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', gap: '28px', alignItems: 'center', padding: '32px 30px 34px' }}>
                <div style={{ position: 'relative', width: '128px', height: '128px' }}>
                  <svg viewBox="0 0 128 128" style={{ width: '128px', height: '128px' }}>
                    <circle cx="64" cy="64" r="52" style={{ fill: 'rgba(52,211,153,.09)', stroke: 'var(--ok-line)', strokeWidth: 2 }} />
                    <circle cx="64" cy="64" r="52" style={{ '--len': 327, fill: 'none', stroke: 'var(--ok)', strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: 327, strokeDashoffset: 0, transform: 'rotate(-90deg)', transformOrigin: '64px 64px', animation: 'tk-draw 1.1s cubic-bezier(.4,0,.2,1) both' } as any} />
                    <path d="M44 66 L58 80 L86 50" style={{ '--len': 76, fill: 'none', stroke: 'var(--ok)', strokeWidth: 5.5, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 76, strokeDashoffset: 0, animation: 'tk-draw .5s cubic-bezier(.4,0,.2,1) .75s both' } as any} />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '25px', fontWeight: 700, letterSpacing: '-.9px' }}>You're going to {eName}.</div>
                  <div style={{ fontSize: '14.5px', lineHeight: 1.65, color: 'var(--muted)', margin: '9px 0 20px' }}>
                    Ticket <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{tId}</strong> is issued against your SA ID and sent to <strong style={{ color: 'var(--violet-lt)' }}>{uEmail}</strong>. Free cancellation until Sep 1.
                  </div>
                  <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                    <span onClick={() => { if (onViewTicket) onViewTicket(); else router.push('/platform?role=student&tab=my-tickets'); }} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 700, background: 'var(--ok)', color: '#04291D', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>View my ticket</span>
                    <span onClick={handleAddToCalendar} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 600, color: addedCal ? 'var(--ok)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>
                      {addedCal ? 'Added to calendar ✓' : 'Add to calendar'}
                    </span>
                    <span onClick={() => addToast('Invite link copied', 'Share it with your batchmates.', 'ok')} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--muted)', border: '1px solid var(--line2)', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>Invite a friend</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', background: 'rgba(8,8,15,.4)', padding: '15px 30px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--dim)', flex: 'none' }}>THIS UNLOCKED</span>
                <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: 'var(--ok)', background: 'var(--ok-tint)', border: '1px solid var(--ok-line)', borderRadius: '100px', padding: '7px 13px' }}>+2 workshop passes</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: 'var(--violet-lt)', background: 'rgba(124,92,252,.14)', border: '1px solid #2E2A55', borderRadius: '100px', padding: '7px 13px' }}>Recruiter access on campus</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-tint)', border: '1px solid var(--warn-line)', borderRadius: '100px', padding: '7px 13px' }}>₹50,000 prize pool entry</span>
                </div>
              </div>
            </div>

            {/* 3 Sub-Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {/* Payment Received */}
              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #0E9F6E, #34D399)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--ok-tint)', border: '1px solid var(--ok-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M5 12.5l4 4 10-10.5" />
                  </svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Payment received</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>INR {pAmount.toLocaleString()} via Razorpay. Invoice SA-INV-22981 is ready.</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span onClick={handleDownloadInvoice} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--ok)', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 19.5h16" /></svg>
                    {invState === 'downloading' ? 'Preparing PDF...' : invState === 'ready' ? 'Downloaded ✓' : 'Download invoice'}
                  </span>

                </div>

                {invState === 'downloading' && (
                  <div style={{ height: '4px', borderRadius: '2px', background: 'var(--line2)', overflow: 'hidden', marginTop: '12px' }}>
                    <div style={{ height: '100%', width: `${invProgress}%`, borderRadius: '2px', background: 'linear-gradient(90deg, #0E9F6E, var(--ok))', transition: 'width 0.2s linear' }} />
                  </div>
                )}
              </div>

              {/* Mentor Accepted */}
              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #4F46C7, #A78BFA)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', border: '1px solid #2E2A55', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-lt)" strokeWidth="1.9">
                    <circle cx="9" cy="9" r="3.2" /><path d="M3 19q6-6 12 0M18 8v6M15 11h6" />
                  </svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Mentor accepted</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>Rahul Sharma confirmed Thursday, 6:00 pm IST. Room link sent.</div>
                
                <span onClick={() => setShowQuestions(!showQuestions)} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--violet-lt)', cursor: 'pointer' }}>
                  {showQuestions ? 'Hide questions ↑' : 'Prepare questions →'}
                </span>

                {showQuestions && (
                  <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                    {[
                      'How did you move from SNIST into a Google SWE loop?',
                      'Which of my three projects is worth putting first?',
                      'Would you refer me for the window closing Friday?',
                    ].map((qText, idx) => {
                      const isPicked = pickedQuestions[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleQuestion(idx)}
                          style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '10px', alignItems: 'start', cursor: 'pointer', opacity: isPicked ? 0.65 : 1 }}
                        >
                          <span style={{ width: '18px', height: '18px', borderRadius: '6px', border: isPicked ? '1.5px solid var(--violet)' : '1.5px solid var(--line2)', background: isPicked ? 'var(--violet)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                            {isPicked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#FFF" strokeWidth="2.2"><path d="M2 6.4l2.6 2.6L10 3.4" /></svg>}
                          </span>
                          <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--muted)' }}>{qText}</span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: '11.5px', color: 'var(--dim)', marginTop: '4px' }}>
                      {Object.values(pickedQuestions).filter(Boolean).length} of 3 picked
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Claimed */}
              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #B45309, #F5B342)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--warn-tint)', border: '1px solid var(--warn-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.9"><path d="M20.5 12.5l-8 8-9-9V4h7.5ZM7.5 8h.01" /></svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Coupon claimed</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>MRIT-MENTOR-40 applied. You saved ₹899 on this booking.</div>
                
                <span onClick={() => setShowSavings(!showSavings)} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warn)', cursor: 'pointer' }}>
                  {showSavings ? 'Hide breakdown ↑' : 'See all offers →'}
                </span>

                {showSavings && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'grid', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--muted)' }}>
                        <span>Mentor session (40% off)</span><span style={{ fontWeight: 700, color: 'var(--ok)' }}>− ₹899</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--muted)' }}>
                        <span>Resume Pro (6 months)</span><span style={{ fontWeight: 700, color: 'var(--ok)' }}>− ₹2,994</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--muted)' }}>
                        <span>Self-drive rentals (30%)</span><span style={{ fontWeight: 700, color: 'var(--ok)' }}>− ₹900</span>
                      </div>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'var(--line2)', overflow: 'hidden', margin: '14px 0 10px' }}>
                      <div style={{ height: '100%', width: `${saveBarWidth}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #B45309, var(--warn))', transition: 'width 1.1s cubic-bezier(.2,.8,.2,1)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '11px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Total saved</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--warn)' }}>₹4,280</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Certificate Card */}
              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid #3B2E7A', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, var(--panel) 100%)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #7C5CFC, #C9A7FF)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,92,252,.2)', border: '1px solid #7C5CFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', background: 'rgba(124,92,252,0.25)', color: '#D8B4FE', padding: '4px 10px', borderRadius: '100px', border: '1px solid rgba(167,139,250,0.4)' }}>
                    VERIFIED ✓
                  </span>
                </div>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px', color: '#FFF' }}>
                  ECHO Certificate Issued
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--muted)', margin: '6px 0 14px' }}>
                  {certInfo?.title || `Certificate of Participation — ${eName}`}
                  <br />
                  <span style={{ fontSize: '11.5px', color: '#A78BFA', fontWeight: 600 }}>Code: {certInfo?.verificationCode || `ECHO26-CERT-${tId.slice(-6).toUpperCase()}`}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={certInfo?.verifyUrl || `/certificates/verify/${certInfo?.verificationCode || 'ECHO26-CERT-448120'}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: '9px', background: '#7C5CFC', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      Verify Online
                    </a>

                    <a
                      href={certInfo?.shareUrl || `https://wa.me/?text=${encodeURIComponent(`Check out my verified certificate for ${eName} on StudentAlumni!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: '9px', background: 'rgba(37,211,102,0.18)', color: '#25D366', border: '1px solid rgba(37,211,102,0.4)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      📲 Share WhatsApp
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      const link = certInfo?.verifyUrl || `${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai'}/certificates/verify/${certInfo?.verificationCode || 'ECHO26-CERT-448120'}`;
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(link);
                      }
                      addToast('Certificate Link Copied', 'Shareable verification URL copied to clipboard.', 'ok');
                    }}
                    style={{ background: 'transparent', border: '1px solid var(--line2)', borderRadius: '9px', padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
                  >
                    📋 Copy Verification Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* FAILURE SCREEN */}
        {activeTab === 'failure' && (
          <div className="tk-anim">
            <div style={{ maxWidth: '620px', marginBottom: '30px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--danger)', marginBottom: '14px' }}>FAILURE STATES</div>
              <div style={{ fontSize: '31px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1.14 }}>Say what broke, and the way out</div>
              <div style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--muted)', marginTop: '10px' }}>
                Never a bare code. Every failure names the cause, says whether money moved, and gives one clear next action.
              </div>
            </div>

            {/* Main Failure Card */}
            <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--danger-line)', borderRadius: '20px', background: 'linear-gradient(150deg, rgba(248,113,134,.09), var(--panel) 62%)', marginBottom: '20px' }}>
              <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(96deg, #B31B38, #F87186 66%, #F0A6E8)', padding: '15px 26px' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2A0710" strokeWidth="2.6" strokeLinecap="round" style={{ flex: 'none' }}>
                  <path d="M12 7v7M12 17.5v.01" /><circle cx="12" cy="12" r="9.5" />
                </svg>
                <span style={{ position: 'relative', fontSize: '14.5px', fontWeight: 700, letterSpacing: '.2px', color: '#2A0710' }}>
                  Payment declined — no money left your account
                </span>
                <span style={{ position: 'relative', marginLeft: 'auto', fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.2px', color: '#2A0710', whiteSpace: 'nowrap' }}>SA-ERR-7F31C9</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', gap: '28px', alignItems: 'center', padding: '32px 30px 34px' }}>
                <div style={{ position: 'relative', width: '128px', height: '128px' }}>
                  <svg viewBox="0 0 128 128" style={{ width: '128px', height: '128px' }}>
                    <circle cx="64" cy="64" r="52" style={{ fill: 'rgba(248,113,134,.08)', stroke: 'var(--danger-line)', strokeWidth: 2 }} />
                    <circle cx="64" cy="64" r="52" style={{ '--len': 327, fill: 'none', stroke: 'var(--danger)', strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: 327, strokeDashoffset: 0, transform: 'rotate(-90deg)', transformOrigin: '64px 64px', animation: 'tk-draw 1.1s cubic-bezier(.4,0,.2,1) both' } as any} />
                    <path d="M50 50 L78 78" style={{ '--len': 40, fill: 'none', stroke: 'var(--danger)', strokeWidth: 5.5, strokeLinecap: 'round', strokeDasharray: 40, strokeDashoffset: 0, animation: 'tk-draw .34s cubic-bezier(.4,0,.2,1) .72s both' } as any} />
                    <path d="M78 50 L50 78" style={{ '--len': 40, fill: 'none', stroke: 'var(--danger)', strokeWidth: 5.5, strokeLinecap: 'round', strokeDasharray: 40, strokeDashoffset: 0, animation: 'tk-draw .34s cubic-bezier(.4,0,.2,1) .92s both' } as any} />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '25px', fontWeight: 700, letterSpacing: '-.9px' }}>Your bank refused the charge.</div>
                  <div style={{ fontSize: '14.5px', lineHeight: 1.65, color: 'var(--muted)', margin: '9px 0 18px' }}>
                    Razorpay reported <strong style={{ color: 'var(--text)', fontWeight: 600 }}>insufficient funds</strong> on the card ending 4291. Your seat is held for 20 minutes while you retry.
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', fontWeight: 600, color: 'var(--warn)', border: '1px solid var(--warn-line)', background: 'var(--warn-tint)', borderRadius: '100px', padding: '9px 15px', marginBottom: '20px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5l3 1.8" /></svg>
                    Seat released in <span style={{ color: 'var(--text)', fontWeight: 700, marginLeft: '4px' }}>{secondsLeft > 0 ? formatTime(secondsLeft) : 'released'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                    <span onClick={handleRetryPayment} className="tk-btn-hover" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '13.5px', fontWeight: 700, background: 'var(--violet)', color: '#FFFFFF', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isRetrying ? 'tk-spin .8s linear infinite' : 'none' }}>
                        <path d="M20 12a8 8 0 11-2.3-5.7M20 4v4h-4" />
                      </svg>
                      {isRetrying ? 'Reaching your bank...' : 'Try another card'}
                    </span>
                    <span onClick={() => addToast('Opening UPI', 'Redirecting to UPI payment app...', 'ok')} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--muted)', border: '1px solid var(--line2)', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>Pay with UPI</span>
                    <span onClick={() => router.push('/contact')} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--muted)', border: '1px solid var(--line2)', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer' }}>Contact support</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', background: 'rgba(8,8,15,.4)', padding: '15px 30px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--dim)', flex: 'none' }}>NOTHING WAS LOST</span>
                <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Form answers saved</span>
                  <span style={{ color: 'var(--dim)' }}>·</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Coupon still valid</span>
                  <span style={{ color: 'var(--dim)' }}>·</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>No charge on your statement</span>
                </div>
              </div>
            </div>

            {/* 3 Failure Sub-Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #B31B38, #F87186)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--danger-tint)', border: '1px solid var(--danger-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M4 4l16 16M20 4L4 20" /></svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Event is full</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>All 985 seats are taken. 41 people are on the waitlist ahead of you.</div>
                <span onClick={() => addToast('Joined Waitlist', 'You will be notified if a seat opens.', 'ok')} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer' }}>Join the waitlist →</span>
              </div>

              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #B45309, #F5B342)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--warn-tint)', border: '1px solid var(--warn-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2"><path d="M12 4l9 16H3Z" /><path d="M12 10v4M12 17v.01" /></svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Coupon expired</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>SA-LEARN-40 ended on Jul 11. Two similar offers are live now.</div>
                <span onClick={() => router.push('/deals')} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warn)', cursor: 'pointer' }}>Show live offers →</span>
              </div>

              <div className="tk-hover-card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 24px 24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', background: 'linear-gradient(90deg, #4F46C7, #A78BFA)' }} />
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', border: '1px solid #2E2A55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-lt)" strokeWidth="1.9"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" /><path d="M12 9v3.5M12 15.5v.01" /></svg>
                </span>
                <div style={{ fontSize: '16.5px', fontWeight: 700, letterSpacing: '-.3px' }}>Verification pending</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', margin: '7px 0 14px' }}>Your college email is unconfirmed, so student pricing is not applied yet.</div>
                <span onClick={() => addToast('Verification Email Sent', 'Check your college inbox.', 'ok')} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--violet-lt)', cursor: 'pointer' }}>Resend the link →</span>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* TICKETS SCREEN */}
        {activeTab === 'tickets' && (
          <div className="tk-anim">
            <div style={{ maxWidth: '620px', marginBottom: '30px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--violet-lt)', marginBottom: '14px' }}>EVENT TICKETS</div>
              <div style={{ fontSize: '31px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1.14 }}>One pass, tied to your SA ID</div>
              <div style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--muted)', marginTop: '10px' }}>
                A torn stub, a scannable block and the details a gate volunteer actually reads. Non-transferable by design.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Primary Ticket */}
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '20px', background: 'linear-gradient(150deg, #5B2DBE 0%, #4B3FD6 46%, #2FB8C6 100%)', boxShadow: '0 26px 60px rgba(0,0,0,.45)' }}>
                <div style={{ position: 'relative', padding: '24px 26px 20px', color: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="26" height="30" viewBox="0 0 300 350" style={{ flex: 'none' }}>
                        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="rgba(255,255,255,.22)" stroke="#FFFFFF" strokeWidth="12" />
                        <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '120px', fontWeight: 700, fill: '#FFFFFF' }}>SA</text>
                      </svg>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px' }}>ENTRY PASS</div>
                        <div style={{ fontSize: '10.5px', opacity: 0.78, marginTop: '2px' }}>studentalumni.ai/verify</div>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, letterSpacing: '1.1px', background: 'rgba(255,255,255,.2)', borderRadius: '100px', padding: '6px 11px', whiteSpace: 'nowrap' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7BFFC4' }} /> VALID
                    </span>
                  </div>

                  <div style={{ fontSize: '27px', fontWeight: 700, letterSpacing: '-1px', margin: '22px 0 4px' }}>{eName}</div>
                  <div style={{ fontSize: '13px', opacity: 0.85 }}>{pVenue}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginTop: '22px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.7, marginBottom: '5px' }}>DATE</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Sep 04–05</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.7, marginBottom: '5px' }}>GATES OPEN</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>08:00 AM</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.7, marginBottom: '5px' }}>SEAT</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>GA · Block C</div>
                    </div>
                  </div>
                </div>

                {/* Torn Stub Divider */}
                <div style={{ position: 'relative', height: '24px' }}>
                  <span style={{ position: 'absolute', left: '-12px', top: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', right: '-12px', top: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', left: '18px', right: '18px', top: '11px', height: '2px', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 7px, transparent 7px 14px)' }} />
                </div>

                {/* QR Code & Attendee Info */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 26px 24px', color: '#FFFFFF', flexWrap: 'wrap' }}>
                  <svg width="76" height="76" viewBox="0 0 46 46" style={{ flex: 'none', borderRadius: '8px' }}>
                    <rect x="0" y="0" width="46" height="46" rx="6" fill="#FFFFFF" />
                    <g fill="#2B1E6E">
                      <rect x="5" y="5" width="12" height="12" rx="2" /><rect x="8" y="8" width="6" height="6" fill="#FFFFFF" />
                      <rect x="29" y="5" width="12" height="12" rx="2" /><rect x="32" y="8" width="6" height="6" fill="#FFFFFF" />
                      <rect x="5" y="29" width="12" height="12" rx="2" /><rect x="8" y="32" width="6" height="6" fill="#FFFFFF" />
                      <rect x="21" y="21" width="4" height="4" /><rect x="29" y="21" width="4" height="4" /><rect x="37" y="25" width="4" height="4" />
                      <rect x="25" y="29" width="4" height="4" /><rect x="33" y="33" width="8" height="8" /><rect x="21" y="37" width="4" height="4" />
                      <rect x="21" y="29" width="4" height="4" /><rect x="29" y="37" width="4" height="4" />
                    </g>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.7, marginBottom: '5px' }}>TICKET NUMBER</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '.6px' }}>{tId}</div>
                    <div style={{ fontSize: '11.5px', opacity: 0.78, marginTop: '6px' }}>{aName} · SA-2026-STU-RNWJMD</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.7, marginBottom: '5px' }}>PAID</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>₹{pAmount}</div>
                  </div>
                </div>
              </div>

              {/* Secondary Passes */}
              <div style={{ display: 'grid', gap: '16px', alignContent: 'start' }}>
                <div
                  className="tk-hover-card"
                  onClick={() =>
                    setQrModalData({
                      tId: 'SA-TKT-448902',
                      eName: 'Voice of Generations',
                      aName: aName,
                      venue: 'VNR VJIET, Hyderabad',
                      date: 'Sep 12, 2026 · 06:00 PM',
                      status: 'READY (GATE A)',
                    })
                  }
                  style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px' }}>
                    <span style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--ok-tint)', border: '1px solid var(--ok-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M9 15l2 2 4-4" /></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Voice of Generations</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px' }}>Sep 12 · VNRVJIT · 06:00 PM</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ok)', border: '1px solid var(--ok-line)', borderRadius: '7px', padding: '5px 9px', flex: 'none' }}>READY</span>
                  </div>
                  <div style={{ position: 'relative', height: '18px', borderTop: '1px dashed var(--line2)' }}>
                    <span style={{ position: 'absolute', left: '-9px', top: '-9px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg)' }} />
                    <span style={{ position: 'absolute', right: '-9px', top: '-9px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '4px 20px 18px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '.4px' }}>SA-TKT-448902</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--violet-lt)', cursor: 'pointer' }}>Show QR →</span>
                  </div>
                </div>

                <div
                  className="tk-hover-card"
                  onClick={() =>
                    setQrModalData({
                      tId: 'SA-TKT-441077',
                      eName: 'VNR ECHO 2026',
                      aName: aName,
                      venue: 'Main Auditorium, VNR VJIET',
                      date: 'Jul 31, 2026 · 09:14 AM',
                      status: 'USED (COMPLETED)',
                    })
                  }
                  style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', opacity: 0.68, cursor: 'pointer' }}
                >
                  <div style={{ position: 'absolute', right: '-34px', top: '22px', transform: 'rotate(38deg)', background: 'var(--line2)', color: 'var(--dim)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', padding: '6px 46px' }}>USED</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px' }}>
                    <span style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--panel2)', border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17" /></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>VNR ECHO 2026</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px' }}>Jul 31 · Scanned at 09:14 AM</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: '18px', borderTop: '1px dashed var(--line2)' }}>
                    <span style={{ position: 'absolute', left: '-9px', top: '-9px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg)' }} />
                    <span style={{ position: 'absolute', right: '-9px', top: '-9px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '4px 20px 18px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '.4px', color: 'var(--muted)' }}>SA-TKT-441077</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--muted)', cursor: 'pointer' }}>View receipt →</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--panel2)', padding: '16px 18px' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--violet-lt)" strokeWidth="1.9" style={{ flex: 'none' }}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" /><path d="M9 12l2 2 4-4" /></svg>
                  <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--muted)' }}>Passes are bound to your SA ID and cannot be transferred. Screenshots will not scan.</div>
                </div>
              </div>
            </div>

            {/* Event Food & Beverage Coupons Section */}
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--line)', paddingTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--ok)', marginBottom: '4px' }}>EVENT FOOD & REFRESHMENT COUPONS</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFF' }}>Included Meal & Beverage Passes</div>
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ok)', background: 'var(--ok-tint)', border: '1px solid var(--ok-line)', borderRadius: '100px', padding: '6px 16px' }}>
                  2 Food Passes Ready to Scan
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* Lunch Combo Food Pass */}
                <div
                  className="tk-hover-card"
                  onClick={() =>
                    setQrModalData({
                      tId: 'FOOD-LUNCH-8841',
                      eName: 'Complimentary Lunch Combo Pass',
                      aName: aName,
                      venue: 'SNIST Food Court (Counter 2)',
                      date: 'Sep 04, 2026 · 01:00 PM – 03:00 PM',
                      status: 'READY TO REDEEM',
                    })
                  }
                  style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.09) 0%, var(--panel) 100%)', padding: '20px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <span style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>Complimentary Lunch Combo Pass</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>Counter 2 · SNIST Main Food Court</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '5px 10px', flex: 'none' }}>
                      ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Includes 1 Veg/Non-Veg Meal Combo + Soft Drink. Show QR code at food counter to claim.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--line2)', paddingTop: '12px', fontSize: '13px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#A78BFA', fontWeight: 700 }}>FOOD-LUNCH-8841</span>
                    <span style={{ color: 'var(--ok)', fontWeight: 700 }}>Show Food QR →</span>
                  </div>
                </div>

                {/* Overnight Snack & Coffee Coupon */}
                <div
                  className="tk-hover-card"
                  onClick={() =>
                    setQrModalData({
                      tId: 'FOOD-SNACK-9923',
                      eName: 'Midnight Coffee & Energy Snacks',
                      aName: aName,
                      venue: 'Auditorium Lounge Counter',
                      date: 'Sep 04, 2026 · 11:30 PM – 02:00 AM',
                      status: 'UNLIMITED REFILLS',
                    })
                  }
                  style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(124,92,252,0.09) 0%, var(--panel) 100%)', padding: '20px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <span style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 010 8h-1M2 8h15v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>Midnight Coffee & Energy Snacks</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>Unlimited Refills · Auditorium Lounge</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '5px 10px', flex: 'none' }}>
                      UNLIMITED
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Unlimited brewed coffee, Red Bull / energy drinks, and cookies during overnight sprint.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--line2)', paddingTop: '12px', fontSize: '13px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#A78BFA', fontWeight: 700 }}>FOOD-SNACK-9923</span>
                    <span style={{ color: 'var(--violet-lt)', fontWeight: 700 }}>Show Food QR →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* COUPONS SCREEN */}
        {activeTab === 'coupons' && (
          <div className="tk-anim">
            <div style={{ maxWidth: '620px', marginBottom: '30px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--warn)', marginBottom: '14px' }}>COUPONS & OFFERS</div>
              <div style={{ fontSize: '31px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1.14 }}>Unlocked by your college email</div>
              <div style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--muted)', marginTop: '10px' }}>
                Every code shows what it saves, when it dies and who it came from. Copy pulls it straight to your clipboard.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
              {/* Coupon 1 */}
              <div
                className="tk-hover-card"
                onClick={() => handleCopyCoupon('MRIT-MENTOR-40', 'saved ₹899')}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px', background: 'linear-gradient(152deg, rgba(124,92,252,.2), var(--panel) 66%)', border: '1px solid #3A2E72', cursor: 'pointer' }}
              >
                <div style={{ position: 'relative', padding: '22px 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--violet-lt)' }}>MENTOR SESSIONS</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#FFFFFF', background: 'var(--violet)', borderRadius: '7px', padding: '5px 9px', whiteSpace: 'nowrap' }}>BEST VALUE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
                    <span style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-2.4px', background: 'linear-gradient(100deg, #C9A7FF, #6FA8F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>40%</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>off first three</span>
                  </div>
                  <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginTop: '12px' }}>Any paid one-to-one booking. Saves about ₹899 per session.</div>
                </div>

                <div style={{ position: 'relative', height: '20px' }}>
                  <span style={{ position: 'absolute', left: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', right: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', left: '16px', right: '16px', top: '9px', height: '1px', background: 'repeating-linear-gradient(90deg, var(--line2) 0 6px, transparent 6px 12px)' }} />
                </div>

                <div style={{ position: 'relative', padding: '4px 22px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', border: '1px dashed #3A2E72', borderRadius: '11px', padding: '13px 14px', background: copiedCode === 'MRIT-MENTOR-40' ? 'rgba(255,255,255,.04)' : 'transparent', transition: 'all .2s ease' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '.8px' }}>MRIT-MENTOR-40</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--violet-lt)', whiteSpace: 'nowrap' }}>
                      {copiedCode === 'MRIT-MENTOR-40' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dim)', marginTop: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5l3 1.8" /></svg>
                    Expires Sep 30 · from CDC SNIST
                  </div>
                </div>
              </div>

              {/* Coupon 2 */}
              <div
                className="tk-hover-card"
                onClick={() => handleCopyCoupon('SA-RESUME-6M', 'saved ₹2,994')}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px', background: 'linear-gradient(152deg, rgba(52,211,153,.16), var(--panel) 66%)', border: '1px solid var(--ok-line)', cursor: 'pointer' }}
              >
                <div style={{ position: 'relative', padding: '22px 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--ok)' }}>RESUME PRO</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ok)', border: '1px solid var(--ok-line)', background: 'var(--ok-tint)', borderRadius: '7px', padding: '5px 9px', whiteSpace: 'nowrap' }}>CLAIMED</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
                    <span style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-2.4px', color: 'var(--ok)' }}>₹0</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>for 6 months</span>
                  </div>
                  <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginTop: '12px' }}>Unlimited ATS rewrites and role-matched keywords. Worth ₹2,994.</div>
                </div>

                <div style={{ position: 'relative', height: '20px' }}>
                  <span style={{ position: 'absolute', left: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', right: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', left: '16px', right: '16px', top: '9px', height: '1px', background: 'repeating-linear-gradient(90deg, var(--line2) 0 6px, transparent 6px 12px)' }} />
                </div>

                <div style={{ position: 'relative', padding: '4px 22px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', border: '1px dashed var(--ok-line)', borderRadius: '11px', padding: '13px 14px', background: copiedCode === 'SA-RESUME-6M' ? 'rgba(255,255,255,.04)' : 'transparent', transition: 'all .2s ease' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '.8px' }}>SA-RESUME-6M</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ok)', whiteSpace: 'nowrap' }}>
                      {copiedCode === 'SA-RESUME-6M' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dim)', marginTop: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.5l4 4 10-10.5" /></svg>
                    Active until Feb 18 · applied to your account
                  </div>
                </div>
              </div>

              {/* Coupon 3 */}
              <div
                className="tk-hover-card"
                onClick={() => handleCopyCoupon('SA-WORKSHOP-2X', 'saved 2 passes')}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px', background: 'linear-gradient(152deg, rgba(245,179,66,.16), var(--panel) 66%)', border: '1px solid var(--warn-line)', cursor: 'pointer' }}
              >
                <div style={{ position: 'relative', padding: '22px 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--warn)' }}>PARTNER WORKSHOPS</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#201200', background: 'var(--warn)', borderRadius: '7px', padding: '5px 9px', whiteSpace: 'nowrap' }}>6 DAYS LEFT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
                    <span style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-2.4px', color: 'var(--warn)' }}>2</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>free passes</span>
                  </div>
                  <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginTop: '12px' }}>Any paid workshop from a partner company this term.</div>
                </div>

                <div style={{ position: 'relative', height: '20px' }}>
                  <span style={{ position: 'absolute', left: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', right: '-10px', top: 0, width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)' }} />
                  <span style={{ position: 'absolute', left: '16px', right: '16px', top: '9px', height: '1px', background: 'repeating-linear-gradient(90deg, var(--line2) 0 6px, transparent 6px 12px)' }} />
                </div>

                <div style={{ position: 'relative', padding: '4px 22px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', border: '1px dashed var(--warn-line)', borderRadius: '11px', padding: '13px 14px', background: copiedCode === 'SA-WORKSHOP-2X' ? 'rgba(255,255,255,.04)' : 'transparent', transition: 'all .2s ease' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '.8px' }}>SA-WORKSHOP-2X</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--warn)', whiteSpace: 'nowrap' }}>
                      {copiedCode === 'SA-WORKSHOP-2X' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dim)', marginTop: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5l3 1.8" /></svg>
                    Expires Sep 06 · referral adds one more
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '20px 24px', marginTop: '18px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--warn-tint)', border: '1px solid var(--warn-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.9"><path d="M20.5 12.5l-8 8-9-9V4h7.5ZM7.5 8h.01" /></svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-.3px' }}>You have saved ₹4,280 this year</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>Across 5 claimed offers · 24 more are live right now</div>
                </div>
              </div>
              <span onClick={() => router.push('/deals')} className="tk-btn-hover" style={{ fontSize: '13.5px', fontWeight: 700, background: 'var(--violet)', color: '#FFFFFF', borderRadius: '11px', padding: '12px 20px', cursor: 'pointer', flex: 'none' }}>Open Deals & Offers</span>
            </div>

            {/* Verticals Tips, Coupons & Offers Board */}
            <div style={{ marginTop: '40px', borderTop: '1px solid var(--line)', paddingTop: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--violet-lt)', marginBottom: '6px' }}>PLATFORM VERTICAL PERKS & PRO TIPS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF' }}>Tips, Coupons & Offers across all StudentAlumni Verticals</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>
                  Curated guidance, verified promo codes, and special benefits for Career, ECHO Events, Mentorship, Startups, and Health.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {/* Vertical 1: Career & Placement */}
                <div style={{ border: '1px solid #3A2E72', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(124,92,252,0.08) 0%, var(--panel) 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#A78BFA' }}>CAREER & PLACEMENT</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>FEATURED VERTICAL</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>Resume & Mock Interview Pass</div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>PRO TIP</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Upload your ATS resume 48h before campus CDC drives for 3.2x higher interview callback rates.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed #4B3FA8', borderRadius: '12px', padding: '12px 14px', background: 'rgba(124,92,252,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>SA-CAREER-PRO</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>100% Free Unlimited ATS Scans</div>
                    </div>
                    <span onClick={() => handleCopyCoupon('SA-CAREER-PRO', 'saved ₹1,499')} style={{ fontSize: '12px', fontWeight: 700, color: '#A78BFA', cursor: 'pointer', background: 'rgba(124,92,252,0.18)', borderRadius: '6px', padding: '6px 12px' }}>
                      {copiedCode === 'SA-CAREER-PRO' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                </div>

                {/* Vertical 2: ECHO Hackathons & Events */}
                <div style={{ border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, var(--panel) 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#34D399' }}>ECHO EVENTS & HACKATHONS</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>LIVE OFFER</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>VIP Gate Pass & Meal Voucher</div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>PRO TIP</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Check in early at Gate 2 with your SA ID to receive VIP front-row seating & complimentary breakfast combos.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed rgba(52,211,153,0.4)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(52,211,153,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>ECHO-VIP-500</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>₹500 OFF Premium Pass</div>
                    </div>
                    <span onClick={() => handleCopyCoupon('ECHO-VIP-500', 'saved ₹500')} style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', cursor: 'pointer', background: 'rgba(52,211,153,0.18)', borderRadius: '6px', padding: '6px 12px' }}>
                      {copiedCode === 'ECHO-VIP-500' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                </div>

                {/* Vertical 3: Alumni Mentorship */}
                <div style={{ border: '1px solid rgba(245,179,66,0.3)', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(245,179,66,0.08) 0%, var(--panel) 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--warn)' }}>ALUMNI MENTORSHIP</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--warn)', background: 'var(--warn-tint)', border: '1px solid var(--warn-line)', borderRadius: '6px', padding: '4px 8px' }}>POPULAR</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>1-on-1 Mentor Session Credit</div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>PRO TIP</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Prepare 3 specific domain questions before booking a 1-on-1 session to receive direct referral recommendations.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed var(--warn-line)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(245,179,66,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>MENTOR-100-FREE</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>100% OFF First 1-on-1 Booking</div>
                    </div>
                    <span onClick={() => handleCopyCoupon('MENTOR-100-FREE', 'saved ₹1,200')} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warn)', cursor: 'pointer', background: 'var(--warn-tint)', borderRadius: '6px', padding: '6px 12px' }}>
                      {copiedCode === 'MENTOR-100-FREE' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                </div>

                {/* Vertical 4: Startups & Incubator */}
                <div style={{ border: '1px solid #3A2E72', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(124,92,252,0.08) 0%, var(--panel) 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#A78BFA' }}>STARTUPS & INCUBATOR</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA', background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '6px', padding: '4px 8px' }}>GRANT PERK</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>$1,000 Cloud Credits & Legal Support</div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>PRO TIP</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Submit your prototype pitch deck before Friday to qualify for the $5,000 SA Innovation Seed Grant.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed #4B3FA8', borderRadius: '12px', padding: '12px 14px', background: 'rgba(124,92,252,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>AWS-CLOUD-1000</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>$1,000 AWS & Cloud Vouchers</div>
                    </div>
                    <span onClick={() => handleCopyCoupon('AWS-CLOUD-1000', 'saved $1,000 credits')} style={{ fontSize: '12px', fontWeight: 700, color: '#A78BFA', cursor: 'pointer', background: 'rgba(124,92,252,0.18)', borderRadius: '6px', padding: '6px 12px' }}>
                      {copiedCode === 'AWS-CLOUD-1000' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                </div>

                {/* Vertical 5: Student Health & SA Care */}
                <div style={{ border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, var(--panel) 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#34D399' }}>STUDENT HEALTH & CARE</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>WELLNESS PERK</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>Annual Health & Telehealth Pass</div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>PRO TIP</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Schedule your annual preventive health checkup on campus to claim your free fitness & wellness passes.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed rgba(52,211,153,0.4)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(52,211,153,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>CARE-CHECKUP-FREE</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>100% Covered Dental & Health Scan</div>
                    </div>
                    <span onClick={() => handleCopyCoupon('CARE-CHECKUP-FREE', 'saved ₹1,999')} style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', cursor: 'pointer', background: 'rgba(52,211,153,0.18)', borderRadius: '6px', padding: '6px 12px' }}>
                      {copiedCode === 'CARE-CHECKUP-FREE' ? 'COPIED ✓' : 'COPY'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Savings Pop Animation */}
      {floatingSavings.map((item) => (
        <span
          key={item.id}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '80px',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--ok)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'tk-rise 1.5s cubic-bezier(.2,.7,.3,1) both',
          }}
        >
          saved ₹899 ✓
        </span>
      ))}

      {/* Floating Toasts List */}
      <div style={{ position: 'fixed', right: '24px', top: '128px', zIndex: 120, display: 'flex', flexDirection: 'column', gap: '10px', width: '330px', maxWidth: 'calc(100vw - 40px)', pointerEvents: 'none' }}>
        {toasts.map((t) => {
          const isOk = t.kind === 'ok';
          const isWarn = t.kind === 'warn';
          const strokeCol = isOk ? 'var(--ok)' : isWarn ? 'var(--warn)' : 'var(--danger)';
          const bgTint = isOk ? 'var(--ok-tint)' : isWarn ? 'var(--warn-tint)' : 'var(--danger-tint)';

          return (
            <div
              key={t.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '32px minmax(0, 1fr) max-content',
                gap: '12px',
                alignItems: 'start',
                border: '1px solid var(--line2)',
                borderRadius: '14px',
                background: 'rgba(16,16,25,.94)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 18px 44px rgba(0,0,0,.34)',
                padding: '13px 14px',
                animation: 'tk-in .38s cubic-bezier(.2,.9,.3,1) both',
              }}
            >
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: bgTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="2.2" strokeLinecap="round">
                  {isOk && <path d="M5 12.5l4 4 10-10.5" />}
                  {isWarn && <path d="M12 4l9 16H3Z M12 10v4M12 17v.01" />}
                  {!isOk && !isWarn && <path d="M12 8v4M12 16v.01 M12 21a9 9 0 100-18 9 9 0 000 18z" />}
                </svg>
              </span>
              <div style={{ minWidth: 0, paddingTop: '1px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, lineHeight: 1.4 }}>{t.title}</div>
                {t.body && <div style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5, marginTop: '3px' }}>{t.body}</div>}
              </div>
              <span onClick={() => removeToast(t.id)} style={{ width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', opacity: 0.55 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" /></svg>
              </span>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: strokeCol, transformOrigin: 'left', opacity: 0.5, animation: 'tk-bar 4.2s linear both' }} />
            </div>
          );
        })}
      </div>

      {/* QR PASS MODAL */}
      {qrModalData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,4,10,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid #3A2E72', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '28px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            <span
              onClick={() => setQrModalData(null)}
              style={{ position: 'absolute', top: 18, right: 20, width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}
            >
              ✕
            </span>

            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ok)', marginBottom: '8px' }}>GATE SCANNER PASS</div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', margin: '0 0 4px' }}>{qrModalData.eName}</h3>
            <div style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px' }}>{qrModalData.venue}</div>

            {/* QR Code Container */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '20px', boxShadow: '0 8px 30px rgba(124,92,252,0.25)' }}>
              <svg width="180" height="180" viewBox="0 0 46 46">
                <rect x="0" y="0" width="46" height="46" fill="#FFFFFF" />
                <g fill="#101019">
                  <rect x="3" y="3" width="14" height="14" rx="3" /><rect x="6" y="6" width="8" height="8" fill="#FFFFFF" />
                  <rect x="29" y="3" width="14" height="14" rx="3" /><rect x="32" y="6" width="8" height="8" fill="#FFFFFF" />
                  <rect x="3" y="29" width="14" height="14" rx="3" /><rect x="6" y="32" width="8" height="8" fill="#FFFFFF" />
                  <rect x="21" y="21" width="5" height="5" /><rect x="29" y="21" width="5" height="5" /><rect x="37" y="25" width="5" height="5" />
                  <rect x="25" y="29" width="5" height="5" /><rect x="33" y="33" width="9" height="9" /><rect x="21" y="37" width="5" height="5" />
                  <rect x="21" y="29" width="5" height="5" /><rect x="29" y="37" width="5" height="5" />
                </g>
              </svg>
            </div>

            <div style={{ background: 'var(--panel2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '14px 18px', textAlign: 'left', marginBottom: '20px', display: 'grid', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Pass Status:</span>
                <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{qrModalData.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Ticket No:</span>
                <span style={{ color: 'var(--violet-lt)', fontWeight: 700, fontFamily: 'monospace' }}>{qrModalData.tId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Attendee:</span>
                <span style={{ color: '#FFF', fontWeight: 600 }}>{qrModalData.aName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Time & Date:</span>
                <span style={{ color: '#FFF', fontWeight: 600 }}>{qrModalData.date}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => addToast('Pass Saved', 'Saved ticket pass to device.', 'ok')}
                style={{ flex: 1, padding: '12px', background: 'var(--violet)', color: '#FFF', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Save to Device
              </button>
              <button
                onClick={() => setQrModalData(null)}
                style={{ padding: '12px 18px', background: 'var(--line2)', color: '#FFF', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default EchoTicketsConfirmationPage;
