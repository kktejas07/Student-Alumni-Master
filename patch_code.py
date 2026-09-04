import re

with open('frontend/app/echo/scan/[code].tsx', 'r') as f:
    content = f.read()

# Replace import
content = content.replace(
    "import { XCircle, Ticket, ArrowLeft, CalendarDays, Clock } from 'lucide-react-native';",
    "import { XCircle, Ticket, ArrowLeft, CalendarDays, Clock } from '@/src/views/web/portals/student/iconShims';"
)

# Remove try/catch (it's around line 122)
content = content.replace("  try {\n  return (\n", "  return (\n")
content = content.replace("""  );
  } catch (e: any) {
    setRenderError(e?.message || 'Unknown error');
    return null;
  }
}""", """  );
}""")

with open('frontend/app/echo/scan/[code].tsx', 'w') as f:
    f.write(content)
