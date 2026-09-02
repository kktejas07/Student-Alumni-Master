/**
 * UnstopImportPage — upload an Unstop CSV of ticket buyers, preview the
 * parsed data, then import it into ECHO registrations + StudentAlumni accounts.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { UploadCloud, FileSpreadsheet, Users, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { AdminLayout } from './AdminLayout';
import { GlassCard, ActionButton } from './primitives';
import { ADMIN_THEME as T } from './theme';
import { api } from '@/src/models/services/api';

type Stats = {
  total: number;
  individuals: number;
  team_groups: number;
  team_members_total: number;
  emails: string[];
};

export default function UnstopImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFilePicked = (f: File) => {
    setFile(f);
    setPreview(null);
    setStats(null);
    setResult(null);
    setError(null);
    handlePreview(f);
  };

  const handlePreview = async (f: File) => {
    setParsing(true);
    setError(null);
    try {
      const r = await api.echoImportUnstopPreview(f);
      setPreview(r.preview || []);
      setStats(r.stats || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to parse CSV');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.echoImportUnstop(file, slug.trim());
      setResult(r);
      setPreview(null);
      setStats(null);
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout title="Import Unstop Tickets" subtitle="Link Unstop ticket buyers to Student Alumni accounts">
      <GlassCard padding={20}>
        <View style={styles.uploadZone}>
          <FileSpreadsheet size={40} color={T.light} />
          <Text style={styles.uploadTitle}>Unstop CSV Export</Text>
          <Text style={styles.uploadHint}>
            Export the participant/buyer list from your Unstop organizer dashboard as CSV, then upload it here.
          </Text>
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            id="unstop-csv-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFilePicked(f);
            }}
          />
          <Pressable
            onPress={() => (document.getElementById('unstop-csv-input') as HTMLInputElement)?.click()}
            testID="choose-csv-btn"
            style={styles.chooseBtn}
          >
            <UploadCloud size={16} color={T.dark} />
            <Text style={{ color: T.dark, fontFamily: 'DMSans_700Bold', fontSize: 13 }}>
              {file ? file.name : 'Choose CSV file'}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      <View style={{ height: 12 }} />

      {/* Slug input appears once a file is chosen */}
      {file && !result && (
        <GlassCard padding={20}>
          <Text style={styles.fieldLabel}>ECHO Event Slug</Text>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. hackwave-3.0"
            style={styles.input as any}
          />
          <Text style={styles.uploadHint}>
            The slug of the ECHO showcase these tickets belong to (e.g. the hackathon or event you sold tickets for).
          </Text>
        </GlassCard>
      )}

      <View style={{ height: 12 }} />

      {parsing && (
        <GlassCard style={{ alignItems: 'center', padding: 30 } as any}>
          <ActivityIndicator color={T.light} />
          <Text style={{ color: T.textDim, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 10 }}>Parsing CSV…</Text>
        </GlassCard>
      )}

      {error && !parsing && (
        <GlassCard style={{ borderColor: T.bad + '55' } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color={T.bad} />
            <Text style={{ color: T.bad, fontFamily: 'DMSans_700Bold', fontSize: 13 }}>Error</Text>
          </View>
          <Text style={{ color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 8 }}>{error}</Text>
        </GlassCard>
      )}

      {stats && preview && (
        <>
          <View style={styles.statsRow}>
            <StatBox label="Total buyers" value={stats.total} />
            <StatBox label="Individuals" value={stats.individuals} />
            <StatBox label="Teams" value={stats.team_groups} />
            <StatBox label="Team members" value={stats.team_members_total} />
          </View>

          <GlassCard padding={16}>
            <Text style={styles.sectionTitle}>Preview ({preview.length} shown)</Text>
          <ScrollView horizontal>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Team</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>Type</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={tdStyle}>{r.full_name || '-'}</td>
                    <td style={tdStyle}>{r.email || '-'}</td>
                    <td style={tdStyle}>{r.team_name || '-'}</td>
                    <td style={tdStyle}>{r.is_team_lead ? 'Lead' : (r.is_team_member ? 'Member' : 'Individual')}</td>
                    <td style={tdStyle}>
                      <Text style={{ color: (r.payment?.status === 'paid') ? T.good : T.bad, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>
                        {(r.payment?.status || '').toUpperCase()}
                      </Text>
                    </td>
                    <td style={tdStyle}>{r.registration_type || 'individual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollView>
          </GlassCard>

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <ActionButton
              label={importing ? 'Importing…' : 'Import tickets & create accounts'}
              icon={importing ? RefreshCw : Users}
              onPress={handleImport}
              testID="import-btn"
            />
          </View>
        </>
      )}

      {result && (
        <GlassCard padding={20}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <CheckCircle2 size={22} color={T.good} />
            <Text style={{ color: T.good, fontFamily: 'DMSans_700Bold', fontSize: 16 }}>Import complete</Text>
          </View>
          <View style={styles.statsRow}>
            <StatBox label="Imported" value={result.imported ?? 0} good />
            <StatBox label="New accounts" value={result.new_accounts ?? 0} good />
            <StatBox label="Existing accounts" value={result.existing_accounts ?? 0} />
            <StatBox label="Errors" value={result.errors?.length ?? 0} bad={(result.errors?.length ?? 0) > 0} />
          </View>
          {result.errors && result.errors.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: T.bad, fontFamily: 'DMSans_700Bold', fontSize: 12, marginBottom: 6 }}>Errors:</Text>
              {result.errors.map((e: string, i: number) => (
                <Text key={i} style={{ color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 }}>• {e}</Text>
              ))}
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <ActionButton label="Import another file" icon={UploadCloud} onPress={() => { setFile(null); setResult(null); setPreview(null); setStats(null); setSlug(''); }} />
          </View>
        </GlassCard>
      )}
    </AdminLayout>
  );
}

function StatBox({ label, value, good, bad }: { label: string; value: string | number; good?: boolean; bad?: boolean }) {
  const color = good ? T.good : (bad ? T.bad : T.light);
  return (
    <GlassCard padding={14} style={{ flex: 1 } as any}>
      <Text style={{ color, fontFamily: 'DMSans_700Bold', fontSize: 22 }}>{value}</Text>
      <Text style={{ color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 }}>{label}</Text>
    </GlassCard>
  );
}

const tableStyle = {
  borderCollapse: 'collapse' as const, minWidth: 640, width: '100%',
};
const thStyle = {
  color: T.textMute, fontFamily: 'DMSans_700Bold', fontSize: 11, textAlign: 'left' as const,
  padding: 10, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase' as const, letterSpacing: 0.4,
};
const tdStyle = {
  color: T.text, fontFamily: 'DMSans_400Regular', fontSize: 12,
  padding: 10, borderBottom: `1px solid ${T.border}`,
};

const styles = StyleSheet.create({
  uploadZone: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
  },
  uploadTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 16, marginTop: 6 },
  uploadHint: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center', maxWidth: 460, lineHeight: 18 },
  chooseBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.light, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
    ...({ cursor: 'pointer' } as any),
  },
  fieldLabel: { color: T.textMute, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    paddingHorizontal: 12, paddingVertical: 10, width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)', borderColor: T.border, borderWidth: 1, borderRadius: 10,
    color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  sectionTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14, marginBottom: 12 },
});
