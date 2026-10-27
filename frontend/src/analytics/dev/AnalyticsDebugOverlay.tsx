/**
 * frontend/src/analytics/dev/AnalyticsDebugOverlay.tsx
 *
 * Enhanced floating debug panel for real-time analytics inspection in __DEV__.
 * Includes Event Feed, Session Summary, and Element CTR (Impression-to-Click) Metrics.
 */

import React, { useEffect, useState } from 'react';
import { getSessionId } from '../core/context';
import { dispatcher, QueuedEvent } from '../core/dispatcher';

export const AnalyticsDebugOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'ctr' | 'summary'>('log');
  const [filterText, setFilterText] = useState('');
  const [events, setEvents] = useState<QueuedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<QueuedEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(dispatcher.getDebugLog());
    }, 800);
    return () => clearInterval(interval);
  }, []);

  if (typeof window === 'undefined') return null;

  const filteredEvents = events.filter((ev) => {
    if (!filterText) return true;
    const search = filterText.toLowerCase();
    return (
      ev.event.toLowerCase().includes(search) ||
      (ev.props.element_id && String(ev.props.element_id).toLowerCase().includes(search)) ||
      (ev.props.screen && String(ev.props.screen).toLowerCase().includes(search))
    );
  });

  // Calculate CTR metrics per element_id
  const ctrMetrics: Record<string, { impressions: number; clicks: number }> = {};
  events.forEach((ev) => {
    const id = ev.props.element_id;
    if (!id || typeof id !== 'string') return;
    if (!ctrMetrics[id]) {
      ctrMetrics[id] = { impressions: 0, clicks: 0 };
    }
    if (ev.event.includes('impression')) {
      ctrMetrics[id].impressions += 1;
    } else if (ev.event.includes('click')) {
      ctrMetrics[id].clicks += 1;
    }
  });

  const ctrList = Object.entries(ctrMetrics).map(([id, data]) => {
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : data.clicks > 0 ? 100 : 0;
    return { id, ...data, ctr: ctr.toFixed(1) };
  });

  const handleClear = () => {
    dispatcher.clearDebugLog();
    setEvents([]);
    setSelectedEvent(null);
  };

  const handleCopyJSON = () => {
    if (selectedEvent) {
      navigator.clipboard.writeText(JSON.stringify(selectedEvent.props, null, 2));
    } else {
      navigator.clipboard.writeText(JSON.stringify(events, null, 2));
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
      }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            padding: '8px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          Analytics ({events.length})
        </button>
      ) : (
        <div
          style={{
            width: 440,
            height: 540,
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 14px',
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: 13, color: '#38bdf8' }}>
                Analytics Debugger
              </span>
              <span
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              >
                {events.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleCopyJSON}
                style={{
                  background: copied ? '#16a34a' : '#334155',
                  color: '#fff',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <button
                onClick={handleClear}
                style={{
                  background: '#991b1b',
                  color: '#fff',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 16,
                  marginLeft: 4,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#090d16',
              borderBottom: '1px solid #1e293b',
              fontSize: 11,
            }}
          >
            <button
              onClick={() => setActiveTab('log')}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: activeTab === 'log' ? '#1e293b' : 'transparent',
                color: activeTab === 'log' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'log' ? 'bold' : 'normal',
              }}
            >
              Feed ({filteredEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('ctr')}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: activeTab === 'ctr' ? '#1e293b' : 'transparent',
                color: activeTab === 'ctr' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'ctr' ? 'bold' : 'normal',
              }}
            >
              CTR Performance ({ctrList.length})
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: activeTab === 'summary' ? '#1e293b' : 'transparent',
                color: activeTab === 'summary' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'summary' ? 'bold' : 'normal',
              }}
            >
              Session Summary
            </button>
          </div>

          {/* Filter Input (Log tab) */}
          {activeTab === 'log' && (
            <div style={{ padding: '6px 10px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter events or IDs..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {activeTab === 'log' ? (
              filteredEvents.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 16, textAlign: 'center' }}>
                  No matching events recorded yet. Perform actions in the app.
                </div>
              ) : (
                filteredEvents.map((ev, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedEvent(selectedEvent === ev ? null : ev)}
                    style={{
                      padding: '6px 10px',
                      marginBottom: 4,
                      borderRadius: 6,
                      background: selectedEvent === ev ? '#334155' : '#1e293b',
                      fontSize: 11,
                      cursor: 'pointer',
                      borderLeft: `3px solid ${
                        ev.event.includes('click')
                          ? '#38bdf8'
                          : ev.event.includes('screen')
                          ? '#a855f7'
                          : ev.event.includes('conversion') || ev.event.includes('submit')
                          ? '#22c55e'
                          : '#eab308'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{ev.event}</span>
                      <span style={{ color: '#64748b', fontSize: 10 }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {ev.props.element_id && (
                      <div style={{ color: '#93c5fd', fontSize: 10, marginTop: 2, fontFamily: 'monospace' }}>
                        {ev.props.element_id}
                      </div>
                    )}

                    {/* Expanded JSON details */}
                    {selectedEvent === ev && (
                      <pre
                        style={{
                          marginTop: 6,
                          background: '#090d16',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 10,
                          overflowX: 'auto',
                          color: '#a7f3d0',
                        }}
                      >
                        {JSON.stringify(ev.props, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )
            ) : activeTab === 'ctr' ? (
              /* CTR Tab */
              ctrList.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 16, textAlign: 'center' }}>
                  No element impressions or clicks tracked yet in this session.
                </div>
              ) : (
                ctrList.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      marginBottom: 6,
                      borderRadius: 6,
                      background: '#1e293b',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace', marginBottom: 4 }}>
                      {item.id}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Impressions: <strong>{item.impressions}</strong></span>
                      <span>Clicks: <strong>{item.clicks}</strong></span>
                      <span style={{ color: '#4ade80', fontWeight: 'bold' }}>CTR: {item.ctr}%</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Summary Tab */
              <div style={{ padding: 8, fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ background: '#1e293b', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase' }}>Session ID</div>
                  <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: 11 }}>{getSessionId()}</div>
                </div>

                <div style={{ background: '#1e293b', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>Active Providers</div>
                  <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>
                    Firebase Analytics (GA4) · PostHog · Console Debugger
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: 10, borderRadius: 6 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>Debug Console Helper</div>
                  <div style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>
                    Type <code style={{ color: '#a7f3d0' }}>window.__ANALYTICS_DEBUG__ = true</code> in DevTools console to force verbose logging.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
