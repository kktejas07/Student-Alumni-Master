import re
import glob

robust_kpi_card = """export function KpiCard({
  Icon, label, value, delta, color = 'purple',
}: { Icon?: any; label: string; value: string; delta: string; color?: 'blue' | 'purple' | 'green' | 'amber' | 'red' | string }) {
  const PALETTES: any = {
    blue:   { tint: 'rgba(37,99,235,0.18)',   border: 'rgba(96,165,250,0.30)',  ic: '#60A5FA' },
    purple: { tint: 'rgba(95,37,159,0.18)',   border: 'rgba(176,127,223,0.30)', ic: '#A78BFA' },
    green:  { tint: 'rgba(6,95,70,0.18)',     border: 'rgba(52,211,153,0.30)',  ic: '#34D399' },
    amber:  { tint: 'rgba(180,83,9,0.18)',    border: 'rgba(245,158,11,0.30)',  ic: '#F59E0B' },
    red:    { tint: 'rgba(239,68,68,0.18)',   border: 'rgba(248,113,113,0.30)', ic: '#F87171' },
  };
  const p = PALETTES[color] || PALETTES.purple;
  const IconComp = Icon;
  return (
    <View style={[styles.kpi, { backgroundColor: p.tint, borderColor: p.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {IconComp && <IconComp size={14} color={p.ic} />}
        <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.4 }}>{label}</Text>
      </View>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: p.ic, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{delta}</Text>
    </View>
  );
}"""

files = glob.glob('frontend/src/views/web/portals/*/atoms.tsx')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to replace the existing KpiCard implementation
    # It usually starts with `export function KpiCard({` and ends with `  ); \n}` or something similar before `const styles`
    
    # Let's find the start of KpiCard
    if 'export function KpiCard' not in content:
        continue
    if 'PALETTES[color] || PALETTES.purple' in content:
        continue # Already robust

    new_content = re.sub(
        r"export function KpiCard\(\{.*?\n\s+\);\n\}",
        robust_kpi_card,
        content,
        flags=re.DOTALL
    )
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Patched {f}")
    else:
        print(f"Failed to patch {f}")

