/**
 * CertificatesCard — list + add + delete user certificates inline.
 *
 * Shows certificate name, issuer, and year. "Add" reveals an inline form
 * with three TextInputs. Each row has a small trash icon.
 *
 * Wired to:
 *   GET    /api/users/me/certificates
 *   POST   /api/users/me/certificates
 *   DELETE /api/users/me/certificates/{cert_id}
 *
 * Adding/deleting also refreshes badges (handled server-side).
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Plus, Award, Trash2, X as CloseX, Save } from 'lucide-react-native';
import { Card } from '@/src/views/components';
import { Colors as C } from '@/src/theme';
import { request } from '@/src/models/services/api';

interface Cert {
  id: string;
  name: string;
  issuer: string;
  year?: number;
  credential_url?: string;
}

interface Props {
  onChanged?: () => void; // parent should re-fetch badges
}

export function CertificatesCard({ onChanged }: Props) {
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', issuer: '', year: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ certificates: Cert[] }>('/users/me/certificates');
      setItems(r.certificates || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setErr(null);
    if (!form.name.trim() || !form.issuer.trim()) {
      setErr('Certificate name and issuer are required.');
      return;
    }
    setBusy(true);
    try {
      await request('/users/me/certificates', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          issuer: form.issuer.trim(),
          year: form.year.trim() ? Number(form.year) : undefined,
        },
      } as any);
      setForm({ name: '', issuer: '', year: '' });
      setAdding(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      setErr(e.message || 'Failed to add certificate.');
    } finally { setBusy(false); }
  };

  const removeCert = async (id: string) => {
    setBusy(true);
    try {
      await request(`/users/me/certificates/${id}`, { method: 'DELETE' } as any);
      await load();
      onChanged?.();
    } finally { setBusy(false); }
  };

  return (
    <Card style={styles.card} testID="profile-certificates-card">
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={styles.icon}><Award size={16} color={C.brandPurple} /></View>
          <View>
            <Text style={styles.title}>Certificates</Text>
            <Text style={styles.subtitle}>{items.length} on file · earns credential badges</Text>
          </View>
        </View>
        {!adding && (
          <Pressable onPress={() => setAdding(true)} style={styles.addBtn} testID="cert-add-btn">
            <Plus size={14} color={C.brandPurple} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Add form */}
      {adding && (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Certificate Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AWS Certified Cloud Practitioner"
            placeholderTextColor="rgba(0,0,0,0.30)"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
            testID="cert-input-name"
          />
          <Text style={styles.fieldLabel}>Issuer *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Amazon Web Services"
            placeholderTextColor="rgba(0,0,0,0.30)"
            value={form.issuer}
            onChangeText={(v) => setForm({ ...form, issuer: v })}
            testID="cert-input-issuer"
          />
          <Text style={styles.fieldLabel}>Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2024"
            placeholderTextColor="rgba(0,0,0,0.30)"
            value={form.year}
            onChangeText={(v) => setForm({ ...form, year: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            maxLength={4}
            testID="cert-input-year"
          />
          {err && <Text style={styles.err}>{err}</Text>}
          <View style={styles.formActions}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={() => { setAdding(false); setErr(null); setForm({ name: '', issuer: '', year: '' }); }}
              testID="cert-cancel-btn"
            >
              <CloseX size={14} color="rgba(0,0,0,0.55)" />
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}
              onPress={submit}
              testID="cert-save-btn"
              disabled={busy}
            >
              <Save size={14} color="#fff" />
              <Text style={styles.btnPrimaryText}>{busy ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* List */}
      {!loading && items.length === 0 && !adding && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No certificates yet. Add one to unlock the credential badge.
          </Text>
        </View>
      )}

      {items.map((c) => (
        <View key={c.id} style={styles.row} testID={`cert-row-${c.id}`}>
          <View style={styles.rowIcon}>
            <Award size={14} color={C.brandPurple} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.certName} numberOfLines={1}>{c.name}</Text>
            <Text style={styles.certMeta} numberOfLines={1}>
              {c.issuer}{c.year ? ` · ${c.year}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => removeCert(c.id)}
            style={styles.delBtn}
            testID={`cert-del-${c.id}`}
            disabled={busy}
          >
            <Trash2 size={14} color="#DC2626" />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(130,71,229,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#0B0510', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  subtitle: { color: 'rgba(11,5,16,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(130,71,229,0.10)',
    ...({ cursor: 'pointer' } as any),
  },
  addBtnText: { color: C.brandPurple, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  form: {
    backgroundColor: 'rgba(130,71,229,0.04)',
    borderColor: 'rgba(130,71,229,0.18)', borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 12, gap: 4,
  },
  fieldLabel: {
    color: 'rgba(11,5,16,0.65)', fontFamily: 'DMSans_700Bold',
    fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 8,
  },
  input: {
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'web' ? 8 : 10,
    borderColor: 'rgba(0,0,0,0.12)', borderWidth: 1, borderRadius: 8,
    backgroundColor: '#fff', color: '#0B0510',
    fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  err: { color: '#DC2626', fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 8 },
  formActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    ...({ cursor: 'pointer' } as any),
  },
  btnGhost: { backgroundColor: 'rgba(0,0,0,0.06)' },
  btnGhostText: { color: 'rgba(0,0,0,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnPrimary: { backgroundColor: C.brandPurple },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopColor: 'rgba(0,0,0,0.06)', borderTopWidth: 1,
  },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(130,71,229,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  certName: { color: '#0B0510', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  certMeta: { color: 'rgba(11,5,16,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  delBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(220,38,38,0.08)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  empty: { paddingVertical: 14 },
  emptyText: { color: 'rgba(11,5,16,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12 },
});
