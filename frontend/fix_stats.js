const fs = require('fs');
const file = '/Users/devendervutukuru/Desktop/My Projects/Student-Alumni-Master/frontend/src/views/web/echo/EchoEventsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                    <div key={si}>
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1.1px', color: stat.color || '#4B3FD6' }}>{stat.value}</div>
                      <div style={{ fontSize: '12.5px', color: '#5F6474', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  
                </div>`;

const replacement = `                    <div key={si}>
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1.1px', color: stat.color || '#4B3FD6' }}>{stat.value}</div>
                      <div style={{ fontSize: '12.5px', color: '#5F6474', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
  console.log('Replaced stats section successfully');
} else {
  console.log('Target stats not found');
}
