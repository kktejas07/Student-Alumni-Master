/**
 * aurora-hero-bg-1 — framer-motion removed; uses CSS keyframes for aurora
 * animation so Metro dev server no longer crashes on tslib ESM resolution.
 */
import React from 'react';

const C = {
  bg: '#080B12',
  text: '#F4F4F8',
  text2: '#A1A6B7',
  text3: '#6E7388',
  primary: '#8B5CF6',
  primaryD: '#2563EB',
  primaryL: '#60A5FA',
  primaryS: 'rgba(139,92,246,0.12)',
};

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  const id = 'sa-aurora-hero-anim';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    @keyframes saAuroraHero { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes saAuroraDrift { 0%{background-position:50% 50%,50% 50%} 50%{background-position:100% 50%,150% 50%} 100%{background-position:50% 50%,50% 50%} }
  `;
  document.head.appendChild(s);
}
if (typeof document !== 'undefined') injectKeyframes();

interface SunsetHeroProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function SunsetHero({
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
}: SunsetHeroProps) {
  const titleWords = title?.split(' ') || [];

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: C.bg,
      } as any}
      role="banner"
      aria-label="Hero section"
    >
      {/* Aurora Gradient Background — animated via CSS keyframes */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          overflow: 'hidden',
          opacity: 0.4,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            top: '-100%', left: '-100%', right: '-100%', bottom: '-100%',
            background: 'repeating-linear-gradient(100deg, #ff6b6b 10%, #feca57 15%, #ff9ff3 20%, #ff6b6b 25%, #feca57 30%)',
            backgroundSize: '300% 100%',
            filter: 'blur(80px)',
            animation: 'saAuroraHero 20s linear infinite',
          } as any}
        />
        <div
          style={{
            position: 'absolute',
            inset: -10,
            background: `
              repeating-linear-gradient(100deg, rgba(255,107,107,0.1) 0%, rgba(255,107,107,0.1) 7%, transparent 10%, transparent 12%, rgba(255,107,107,0.1) 16%),
              repeating-linear-gradient(100deg, #ff6b6b 10%, #feca57 15%, #ff9ff3 20%, #ff6b6b 25%, #feca57 30%)
            `,
            backgroundSize: '200%, 100%',
            backgroundPosition: '50% 50%, 50% 50%',
            mixBlendMode: 'difference',
            animation: 'saAuroraDrift 15s linear infinite',
          } as any}
        />
      </div>

      {/* Vignette Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Content Layer */}
      {children ? (
        <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>{children}</div>
      ) : (
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 1024, margin: '0 auto', animation: 'saSlideUp 1.2s ease-out forwards' }}>
            {/* Title */}
            {title && (
              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                  fontWeight: 700,
                  marginBottom: 32,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                }}
              >
                {titleWords.map((word, wordIndex) => (
                  <span key={wordIndex} style={{ display: 'inline-block', marginRight: 16 }}>
                    {word.split('').map((letter, letterIndex) => (
                      <span
                        key={`${wordIndex}-${letterIndex}`}
                        style={{
                          display: 'inline-block',
                          background: 'linear-gradient(135deg, #F4F4F8 0%, #A1A6B7 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: '0 0 20px rgba(139,92,246,0.3)',
                        } as any}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                ))}
              </h1>
            )}

            {/* Description */}
            {description && (
              <p
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                  color: '#A1A6B7',
                  marginBottom: 40,
                  maxWidth: 768,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  lineHeight: 1.6,
                }}
              >
                {description}
              </p>
            )}

            {/* Action Buttons */}
            {(primaryAction || secondaryAction) && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    style={{
                      padding: '16px 32px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 9999,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: '#8B5CF6',
                      color: '#fff',
                      boxShadow: '0 4px 24px rgba(139,92,246,0.35)',
                      transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                    }}
                    aria-label={primaryAction.label}
                  >
                    {primaryAction.label}
                  </button>
                )}
                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    style={{
                      padding: '16px 32px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: '#A1A6B7',
                      transition: 'background-color 0.3s ease',
                    }}
                    aria-label={secondaryAction.label}
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
