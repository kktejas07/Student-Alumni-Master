import React from 'react';
import { motion } from 'framer-motion';

const C = {
  bg: '#080B12',
  text: '#F4F4F8',
  text2: '#A1A6B7',
  text3: '#6E7388',
  primary: '#8B5CF6',
  primaryD: '#7C3AED',
  primaryL: '#A78BFA',
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
    <motion.section
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: C.bg,
      } as any}
      role="banner"
      aria-label="Hero section"
    >
      {/* Sunset Gradient Background */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          overflow: 'hidden',
          opacity: 0.4,
        }}
        aria-hidden="true"
      >
        <motion.div
          style={{
            position: 'absolute',
            top: '-100%', left: '-100%', right: '-100%', bottom: '-100%',
            background: 'repeating-linear-gradient(100deg, #ff6b6b 10%, #feca57 15%, #ff9ff3 20%, #ff6b6b 25%, #feca57 30%)',
            backgroundSize: '300% 100%',
            filter: 'blur(80px)',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          style={{
            position: 'absolute',
            inset: -10,
            background: `
              repeating-linear-gradient(100deg, rgba(255,107,107,0.1) 0%, rgba(255,107,107,0.1) 7%, transparent 10%, transparent 12%, rgba(255,107,107,0.1) 16%),
              repeating-linear-gradient(100deg, #ff6b6b 10%, #feca57 15%, #ff9ff3 20%, #ff6b6b 25%, #feca57 30%)
            `,
            backgroundSize: '200%, 100%',
            backgroundPosition: '50% 50%, 50% 50%',
            mixBlendMode: 'difference' as any,
          }}
          animate={{
            backgroundPosition: ['50% 50%, 50% 50%', '100% 50%, 150% 50%', '50% 50%, 50% 50%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
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
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ maxWidth: 1024, margin: '0 auto' }}
          >
            {/* Animated Title */}
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
                      <motion.span
                        key={`${wordIndex}-${letterIndex}`}
                        initial={{ y: 100, opacity: 0, filter: 'blur(8px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        transition={{
                          delay: wordIndex * 0.1 + letterIndex * 0.03,
                          type: 'spring',
                          stiffness: 100,
                          damping: 15,
                        }}
                        style={{
                          display: 'inline-block',
                          background: 'linear-gradient(135deg, #F4F4F8 0%, #A1A6B7 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: '0 0 20px rgba(139,92,246,0.3)',
                        }}
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </h1>
            )}

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
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
              </motion.p>
            )}

            {/* Action Buttons */}
            {(primaryAction || secondaryAction) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
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
                  <motion.button
                    onClick={primaryAction.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                      transition: 'box-shadow 0.3s ease',
                    }}
                    aria-label={primaryAction.label}
                  >
                    {primaryAction.label}
                  </motion.button>
                )}
                {secondaryAction && (
                  <motion.button
                    onClick={secondaryAction.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}
