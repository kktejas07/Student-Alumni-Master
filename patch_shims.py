import re

with open('frontend/src/views/web/portals/student/iconShims.tsx', 'r') as f:
    content = f.read()

new_icons = """export const ArrowLeft       = make('arrow-left');
export const XCircle         = make('close-circle-outline');
export const CalendarDays    = make('calendar-range');"""

if "ArrowLeft" not in content:
    content = content.replace("export const ArrowRight      = make('arrow-right');", "export const ArrowRight      = make('arrow-right');\n" + new_icons)
    
with open('frontend/src/views/web/portals/student/iconShims.tsx', 'w') as f:
    f.write(content)
