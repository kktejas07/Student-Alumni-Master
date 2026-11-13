// @ts-nocheck
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export const ANNOUNCEMENT_TICKER_HEIGHT = 36;

export const ANNOUNCEMENT_ITEMS = [
  'ECHO Flagship Hackathons & Summits · Live across top engineering campuses',
  'Built with love for students across all campuses',
  'The network is a feed until it meets in person.',
  '86 ECHO events across 31 campuses.',
  '267 roles matched, 41 with a warm referral path.',
  'Verified by your college email — free forever for students.',
];

/**
 * AnnouncementTicker — Global continuous horizontal scrolling announcement ticker.
 *
 * Visual specifications:
 * - Dark navy background (#090B18)
 * - Muted grey typography (#8A8A9E / 13px / Outfit)
 * - Violet-lt separator dots (5px, #A78BFA)
 * - Continuous infinite marquee translation (-50%) with zero jump or stutter
 * - Pause on hover
 * - Prefers-reduced-motion accessibility support
 */
export function AnnouncementTicker() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const STYLE_ID = 'sa-global-ticker-styles';
    if (document.getElementById(STYLE_ID)) return;

    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      @keyframes sa-announcement-tick {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }

      .sa-ticker-container {
        width: 100%;
        overflow: hidden;
        background-color: #090B18;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        height: ${ANNOUNCEMENT_TICKER_HEIGHT}px;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        user-select: none;
      }

      .sa-ticker-track {
        display: flex;
        width: max-content;
        align-items: center;
        animation: sa-announcement-tick 46s linear infinite;
        will-change: transform;
      }

      .sa-ticker-container:hover .sa-ticker-track {
        animation-play-state: paused;
      }

      .sa-ticker-set {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
      }

      .sa-ticker-item {
        display: inline-flex;
        align-items: center;
        gap: 26px;
        padding: 0 26px;
        white-space: nowrap;
      }

      .sa-ticker-text {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #8A8A9E;
        letter-spacing: 0.1px;
      }

      .sa-ticker-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background-color: #A78BFA;
        flex: 0 0 auto;
        box-shadow: 0 0 6px rgba(167, 139, 250, 0.45);
      }

      @media (prefers-reduced-motion: reduce) {
        .sa-ticker-container {
          overflow-x: auto;
        }
        .sa-ticker-track {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  const renderItemSet = (prefix: string) => (
    <div className="sa-ticker-set" key={prefix}>
      {ANNOUNCEMENT_ITEMS.map((text, idx) => (
        <span className="sa-ticker-item" key={`${prefix}-${idx}`}>
          <span className="sa-ticker-text">{text}</span>
          <span className="sa-ticker-dot" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      id="ev-tickwrap"
      className="sa-ticker-container"
      role="region"
      aria-label="Campus announcements"
    >
      <div id="ev-ticker" className="sa-ticker-track">
        {/* Render 2 identical sets for smooth -50% translateX loop */}
        {renderItemSet('set-a')}
        {renderItemSet('set-b')}
      </div>
    </div>
  );
}

export default AnnouncementTicker;

