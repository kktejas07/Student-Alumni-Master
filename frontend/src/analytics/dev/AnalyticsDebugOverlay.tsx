/**
 * frontend/src/analytics/dev/AnalyticsDebugOverlay.tsx
 *
 * Floating debug panel for inspectable real-time event logs in __DEV__.
 */

import React, { useEffect, useState } from 'react';
import { dispatcher, QueuedEvent } from '../core/dispatcher';

export const AnalyticsDebugOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<QueuedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<QueuedEvent | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(dispatcher.getDebugLog());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (typeof window === 'undefined') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 99999,
        fontFamily: 'monospace',
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
          }}
        >
          ✨ Analytics ({events.length})
        </button>
      ) : (
        <div
          style={{
            width: 380,
            height: 480,
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
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
            <span style={{ fontWeight: 'bold', fontSize: 13, color: '#38bdf8' }}>
              ✨ Analytics Debugger ({events.length})
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {/* Events List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {events.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 12, padding: 12 }}>
                No events recorded yet. Perform actions to see events.
              </div>
            ) : (
              events.map((ev, i) => (
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
                        : '#22c55e'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{ev.event}</span>
                    <span style={{ color: '#64748b' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {ev.props.element_id && (
                    <div style={{ color: '#cbd5e1', fontSize: 10, marginTop: 2 }}>
                      {ev.props.element_id}
                    </div>
                  )}

                  {/* Expanded JSON details */}
                  {selectedEvent === ev && (
                    <pre
                      style={{
                        marginTop: 6,
                        background: '#090d16',
                        padding: 6,
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
