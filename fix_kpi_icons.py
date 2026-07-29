import re

file_path = 'frontend/src/views/web/portals/alumni/views/DashboardView.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

old_kpi_icons = "const KPI_ICONS = { matches: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp } as const;"
new_kpi_icons = "const KPI_ICONS = { matches: Briefcase, applications: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp, events: Calendar } as const;"

content = content.replace(old_kpi_icons, new_kpi_icons)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)
