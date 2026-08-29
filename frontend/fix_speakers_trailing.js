const fs = require('fs');
const file = '/Users/devendervutukuru/Desktop/My Projects/Student-Alumni-Master/frontend/src/views/web/echo/EchoEventsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            ))}

            {/* Ungrouped Speakers */}
                  </div>
                ))}

                {/* Ungrouped speakers */}`;

const replacement = `            ))}

                {/* Ungrouped speakers */}`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
  console.log('Replaced trailing syntax error successfully');
} else {
  console.log('Target trailing syntax error not found');
}
