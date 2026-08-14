/**
 * frontend/src/views/web/components/UnstopEventsShowcase.tsx
 *
 * Interactive Unstop Events & Workshops Showcase Component.
 * Fully instrumented with Unified Analytics (<TrackedCard>, <Trackable>).
 */

import React, { useEffect, useState } from 'react';
import { Trackable, TrackedCard } from '../../../analytics';

export interface UnstopOpportunity {
  slug: string;
  title: string;
  tagline?: string;
  category: string;
  type: string;
  organizer_name: string;
  date: string;
  end_date?: string;
  banner_url: string;
  description: string;
  external_url: string;
  event_status_badge: string;
}

const CATEGORIES = [
  { id: 'all', label: '🌟 All Opportunities' },
  { id: 'Hackathons & Coding', label: '💻 Hackathons' },
  { id: 'Workshops & Webinars', label: '🛠️ Workshops' },
  { id: 'Quizzes & Contests', label: '💡 Quizzes' },
  { id: 'Competitions & Case Studies', label: '🏆 Competitions' },
];

export const UnstopEventsShowcase: React.FC = () => {
  const [opportunities, setOpportunities] = useState<UnstopOpportunity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8002/api/echo/showcases');
      if (res.ok) {
        const data = await res.json();
        // Filter unstop items
        const unstopItems = (data.showcases || data || []).filter(
          (item: any) => item.source === 'unstop' || (item.slug && item.slug.startsWith('unstop-'))
        );
        setOpportunities(unstopItems);
      }
    } catch (e) {
      // Fallback empty list
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('http://localhost:8002/api/echo/sync-unstop', { method: 'POST' });
      if (res.ok) {
        await fetchOpportunities();
      }
    } catch (e) {
      /* swallow */
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const filtered = opportunities.filter((op) => {
    const matchesCat = selectedCategory === 'all' || op.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      op.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.organizer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            🚀 Explore Live Unstop Opportunities
          </h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 14 }}>
            Discover national hackathons, skill workshops, quizzes, and hiring challenges from top colleges & companies.
          </p>
        </div>

        <Trackable id="sa.echo.list.btn.sync-unstop" label="Refresh Opportunities" onPress={triggerSync}>
          <button
            disabled={syncing}
            style={{
              background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {syncing ? '🔄 Syncing Unstop...' : '⚡ Sync Live Opportunities'}
          </button>
        </Trackable>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search events, hackathons, partners..."
          style={{
            padding: '8px 14px',
            borderRadius: 20,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            minWidth: 240,
            outline: 'none',
          }}
        />

        {CATEGORIES.map((cat) => (
          <Trackable
            key={cat.id}
            id={`sa.echo.filter.chip.${cat.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            label={cat.label}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <button
              style={{
                background: selectedCategory === cat.id ? '#0f172a' : '#f1f5f9',
                color: selectedCategory === cat.id ? '#fff' : '#475569',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {cat.label}
            </button>
          </Trackable>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b', fontSize: 15 }}>
          ⏳ Fetching live Unstop events...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f8fafc', borderRadius: 12, color: '#64748b' }}>
          No opportunities found in this category. Click <strong>Sync Live Opportunities</strong> above!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {filtered.map((item) => (
            <TrackedCard
              key={item.slug}
              id="sa.echo.list.card.event"
              label={item.title}
              props={{ echo_id: item.slug, unstop_url: item.external_url, category: item.category }}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{ position: 'relative', height: 160, background: '#0f172a', overflow: 'hidden' }}>
                <img
                  src={item.banner_url}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as any).src =
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: item.event_status_badge === 'Live' ? '#16a34a' : '#d97706',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {item.event_status_badge || 'Live'}
                </span>
              </div>

              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.organizer_name}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '6px 0 8px 0', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>📅 {item.date}</span>
                    <span>📍 Virtual</span>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>FREE</span>

                  <Trackable id="sa.echo.detail.btn.view-details" label={item.title} props={{ external_url: item.external_url }}>
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Apply on Unstop ↗
                    </a>
                  </Trackable>
                </div>
              </div>
            </TrackedCard>
          ))}
        </div>
      )}
    </div>
  );
};
