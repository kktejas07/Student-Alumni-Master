const fs = require('fs');
let code = fs.readFileSync('frontend/app/profile/[id].tsx', 'utf-8');

// Replace standard white texts with C.text
code = code.replace(/color: '#fff'/g, "color: C.text");

// Replace standard white backgrounds with white/grey
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.04\\)'/g, "backgroundColor: C.card");
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.05\\)'/g, "backgroundColor: C.card");
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.03\\)'/g, "backgroundColor: C.card");
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.10\\)'/g, "backgroundColor: 'rgba(0,0,0,0.05)'");
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.12\\)'/g, "backgroundColor: 'rgba(0,0,0,0.08)'");
code = code.replace(/backgroundColor: 'rgba\\(255,255,255,0\\.06\\)'/g, "backgroundColor: 'rgba(0,0,0,0.04)'");

// Borders
code = code.replace(/borderColor: 'rgba\\(255,255,255,0\\.20\\)'/g, "borderColor: 'rgba(0,0,0,0.1)'");
code = code.replace(/borderColor: 'rgba\\(255,255,255,0\\.12\\)'/g, "borderColor: 'rgba(0,0,0,0.1)'");

// Buttons should still have white text if they are primary (C.purple/C.green)
code = code.replace(/errBtnText: \\{ color: C\\.text, fontFamily/g, "errBtnText: { color: '#fff', fontFamily");
code = code.replace(/btnTextWhite: \\{ color: C\\.text, fontFamily/g, "btnTextWhite: { color: '#fff', fontFamily");
code = code.replace(/color: C\\.text \\}\\]} numberOfLines=\\{1\\}\\>\\{badge.label\\}/g, "color: '#fff' }]} numberOfLines={1}>{badge.label}");

// Verify icon color on primary backgrounds
code = code.replace(/Check size=\\{11\\} color=\\"C\\.text\\"/g, 'Check size={11} color="#fff"');
code = code.replace(/Crown size=\\{9\\} color=\\"C\\.text\\"/g, 'Crown size={9} color="#fff"');

fs.writeFileSync('frontend/app/profile/[id].tsx', code);
