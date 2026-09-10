const fs = require('fs');
const file = '/Users/devendervutukuru/Desktop/My Projects/Student-Alumni-Master/frontend/src/views/web/echo/EchoEventsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                    <div className="ev-detail-speakers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {speakers.map((spk: any, idx: number) => (
                        <div key={idx} className="ev-mini ev-detail-speaker-card" style={{ padding: '20px 18px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {spk.photo_url ? (
                            <img src={spk.photo_url} alt={spk.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                          ) : (
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: \`linear-gradient(135deg, \${catColors[catName] || '#7C5CFC'}, #38BDF8)\`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px' }}>
                              {spk.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div className="ev-detail-speaker-name" style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{spk.name}</div>
                          <div className="ev-detail-speaker-role" style={{ fontSize: '12.5px', color: catColors[catName] || 'var(--violet-lt)', fontWeight: 600, marginTop: '3px' }}>{[spk.position, spk.company].filter(Boolean).join(', ')}</div>
                          {spk.location && (
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                              {spk.location}
                            </div>
                          )}
                          {spk.linkedin_url && (
                            <a href={spk.linkedin_url.startsWith('http') ? spk.linkedin_url : \`https://linkedin.com/\${spk.linkedin_url}\`} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600, marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                              LinkedIn
                            </a>
                          )}
                        </div>
                      ))}
                    </div>`;

const replacement = `                    <div className="ev-detail-speaker-name" style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{spk.name}</div>
                    <div className="ev-detail-speaker-role" style={{ fontSize: '12.5px', color: 'var(--violet-lt)', fontWeight: 600, marginTop: '3px' }}>{[spk.role, spk.org].filter(Boolean).join(', ')}</div>
                    {spk.loc && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                        {spk.loc}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CMS Grouped Speakers */}
            {Object.keys(catGroups).map((catName) => (
              <div key={catName} style={{ marginBottom: '22px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: catColors[catName] || '#C4B5FD', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', padding: '6px 14px', marginBottom: '14px' }}>
                  {catName.toUpperCase()}
                </div>
                <div className="ev-detail-speakers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {catGroups[catName].map((spk: any, idx: number) => (
                    <div key={idx} className="ev-mini ev-detail-speaker-card" style={{ padding: '20px 18px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {spk.photo_url ? (
                        <img src={spk.photo_url} alt={spk.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                      ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: \`linear-gradient(135deg, \${catColors[catName] || '#7C5CFC'}, #38BDF8)\`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px' }}>
                          {spk.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      )}
                      <div className="ev-detail-speaker-name" style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{spk.name}</div>
                      <div className="ev-detail-speaker-role" style={{ fontSize: '12.5px', color: catColors[catName] || 'var(--violet-lt)', fontWeight: 600, marginTop: '3px' }}>{[spk.position, spk.company].filter(Boolean).join(', ')}</div>
                      {spk.location && (
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                          {spk.location}
                        </div>
                      )}
                      {spk.linkedin_url && (
                        <a href={spk.linkedin_url.startsWith('http') ? spk.linkedin_url : \`https://linkedin.com/\${spk.linkedin_url}\`} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600, marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped Speakers */}`;

if (content.includes(target)) {
  const newContent = content.replace(target, replacement).replace('                ))}', '                '); // Clean up the stray `))}` after the replacement if it existed.
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Target not found');
}
