/**
 * /echo/marketplace — Event Marketplace (no slug required).
 * Shows available events with marketplaces, or redirects if only one exists.
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '@/src/models/services/api';

const THEME_VARS = {
  '--bg': '#05060F',
  '--card': '#0C0E1B',
  '--panel': '#0C0E1B',
  '--panel2': '#10121E',
  '--line': '#1B1E33',
  '--text': '#F4F5FB',
  '--muted': '#9AA0B4',
  '--violet': '#7C5CFC',
  '--violet-lt': '#A78BFA',
} as React.CSSProperties;

export default function MarketplaceIndexPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.listEchoShowcases().then((res) => {
      if (mounted && res?.items) setEvents(res.items);
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loading && events.length === 1 && events[0]?.slug) {
      window.location.href = `/echo/${events[0].slug}/marketplace`;
    }
  }, [loading, events]);

  return (
    <div style={{ ...THEME_VARS, minHeight: '100vh', background: '#05060F', color: '#F4F5FB' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: 'rgba(10,10,20,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1F1F30', height: 64, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ maxWidth: 1400, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/echo" style={{ fontSize: 20, fontWeight: 800, color: '#F4F5FB', textDecoration: 'none', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#A78BFA' }}>ECHO</span> Marketplace
          </a>
          <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="/echo" style={{ fontSize: 14, fontWeight: 600, color: '#9AA0B4', textDecoration: 'none' }}>Events</a>
            <a href="/echo/marketplace" style={{ fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' }}>Marketplace</a>
          </nav>
        </div>
      </header>

      <div style={{ paddingTop: 100, maxWidth: 1000, width: '100%', margin: '0 auto', padding: '100px 20px 60px' }}>
        {/* Back link */}
        <a href="/echo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 24 }}>
          ← Back to ECHO
        </a>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Event Marketplace</h1>
          <p style={{ fontSize: 15, color: '#9AA0B4', marginTop: 8, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Pre-order food, beverages, and exclusive handcrafts to collect at the event!
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9AA0B4' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9AA0B4' }}>
            <p style={{ fontSize: 16, margin: 0 }}>No events available yet</p>
            <p style={{ fontSize: 13, marginTop: 8, opacity: 0.6 }}>Check back later for upcoming events with marketplaces.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {events.map((ev) => (
              <a
                key={ev.id || ev.slug}
                href={`/echo/${ev.slug}/marketplace`}
                onClick={(e) => { e.preventDefault(); window.location.href = `/echo/${ev.slug}/marketplace`; }}
                style={{
                  borderRadius: 18, overflow: 'hidden', textDecoration: 'none', color: '#F4F5FB',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                  transition: 'all .2s ease', display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.5)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                {(ev.hero_image_url || ev.banner_url || ev.poster_url) ? (
                  <div style={{ height: 180, overflow: 'hidden' }}>
                    <img src={ev.hero_image_url || ev.banner_url || ev.poster_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: 180, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  </div>
                )}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{ev.title || 'ECHO Event'}</div>
                  <div style={{ fontSize: 13, color: '#9AA0B4' }}>{ev.college_name || ev.college || ev.organizer_name || 'ECHO Campus'}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {(ev.date || ev.dates) && <span>{ev.date || ev.dates}</span>}
                    {ev.venue && <span>· {ev.venue}</span>}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(124,58,237,0.15)', borderRadius: 10, padding: '10px 14px', alignSelf: 'flex-start', fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>
                    Browse Marketplace
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
