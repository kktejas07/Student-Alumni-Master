import React, { useEffect, useState } from 'react';

export function TrendChart() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'relative', width: '220px', height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '12px' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(241,184,217,0.1) 0%, transparent 100%)', borderRadius: '8px' }} />
      {/* Bars */}
      {[24, 38, 52, 41, 68, 55, 85].map((h, i) => (
        <div
          key={i}
          style={{
            width: '18px',
            height: animated ? `${h}%` : '0%',
            backgroundColor: i === 6 ? '#F1B8D9' : 'rgba(241,184,217,0.3)',
            borderRadius: '4px',
            transition: `height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 0.1}s`,
            transformOrigin: 'bottom'
          }}
        />
      ))}
      {/* Hover/Annotation */}
      <div style={{
        position: 'absolute', top: 0, right: 0, background: '#F1B8D9', color: '#3A2352', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px',
        opacity: animated ? 1 : 0,
        transform: animated ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s ease 0.9s'
      }}>
        +8%
      </div>
    </div>
  );
}

export function PhotoGrid() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const photos = [
    { bg: '#3B82F6', text: 'SA' },
    { bg: '#10B981', text: 'VNR' },
    { bg: '#F59E0B', text: 'KMIT' },
    { bg: '#8B5CF6', text: 'CBIT' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '200px' }}>
      {photos.map((p, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1',
            backgroundColor: p.bg,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '18px',
            opacity: animated ? 1 : 0,
            transform: animated ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
            transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15}s`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}
