// @ts-nocheck
/**
 * Super Admin → Certificates view.
 *
 * Issue + verify certificates for the platform's public verification
 * system (Coursera-style /certificates/verify/{code}).
 *
 * Tabs:
 *   Issue    — single platform cert (auto SA-XXXX-XXXX code)
 *   Bulk     — paste up to 1000 email|title rows → bulk issue
 *   External — store a third-party cert (Udemy/Coursera/LinkedIn...) with
 *              auto issuer classification + deep link
 *   Verify   — look up any code to confirm validity
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Award, Upload, ExternalLink, ShieldCheck, Search, Mail,
  Sparkles, Link2, X, AlertTriangle, CheckCircle2, User, FileUp, FileText,
  FolderOpen, RefreshCw, Copy, Trash2,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, Card, IconBox, SectionLabel,
  TopTabs, Toast, useToast,
} from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import * as Linking from 'expo-linking';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

type TabId = 'issue' | 'bulk' | 'external' | 'verify' | 'files' | 'registry';

const TAB_IDS: TabId[] = ['registry', 'issue', 'bulk', 'files', 'external', 'verify'];

export function CertificatesView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const [tab, setTab] = useSubTab<TabId>(TAB_IDS, 'registry', { sub, onSub });
  const { toast, flash } = useToast();

  const tabs = [
    { id: 'registry', label: 'Registry',  icon: FolderOpen },
    { id: 'issue',    label: 'Issue',     icon: Award },
    { id: 'bulk',     label: 'Bulk Issue', icon: Upload },
    { id: 'files',    label: 'Files',     icon: FileUp },
    { id: 'external', label: 'External',  icon: ExternalLink },
    { id: 'verify',   label: 'Verify',    icon: ShieldCheck },
  ] as const;

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBox size={38}><Award size={18} color={GRAD.to} /></IconBox>
            <View>
              <Text style={s.title}>Certificates</Text>
              <Text style={s.sub}>
                Issue verifiable certificates (Coursera-style SA codes), upload certificate
                files (PNG/JPEG/WEBP/PDF), store third-party credentials with issuer
                classification, and confirm any certificate from the public
                /certificates/verify page. The Registry tab lists every certificate
                stored in the system.
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <TopTabs<TabId> tabs={tabs as any} active={tab} onChange={setTab} />

      {tab === 'registry' && <RegistryTab onSaved={flash} />}
      {tab === 'issue'    && <IssueTab onSaved={flash} />}
      {tab === 'bulk'     && <BulkTab onSaved={flash} />}
      {tab === 'files'    && <FilesTab onSaved={flash} />}
      {tab === 'external' && <ExternalTab onSaved={flash} />}
      {tab === 'verify'   && <VerifyTab onSaved={flash} />}

      <Toast text={toast.text} visible={toast.visible} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  REGISTRY TAB — browse every certificate stored in the system
 * ══════════════════════════════════════════════════════════════════ */
function RegistryTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const branches = ['ALL', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];

  const load = useCallback(async (targetPage = 1) => {
    setError(null);
    setLoading(true);
    try {
      const skip = (targetPage - 1) * LIMIT;
      const params = new URLSearchParams({ limit: String(LIMIT), skip: String(skip) });
      if (q.trim()) params.set('q', q.trim());
      if (branch !== 'ALL') params.set('branch', branch);
      const r: any = await request(`/certificates/list?${params.toString()}`, { method: 'GET', auth: true });
      const list: any[] = r?.items || [];
      setTotal(r?.total ?? list.length);
      setItems(list);
      setPage(targetPage);
    } catch (e: any) {
      setError(e?.message || 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  }, [q, branch]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  const reload = () => {
    load(1);
  };

  const copyUrl = async (id: string) => {
    const u = `${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai'}/certificates/verify/${encodeURIComponent(id)}`;
    try {
      if (navigator?.clipboard) await navigator.clipboard.writeText(u);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const doDelete = async (code: string) => {
    if (Platform.OS === 'web' && !window.confirm(`Delete certificate ${code}? This cannot be undone.`)) return;
    setDeleting(code);
    try {
      await request(`/certificates/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true });
      onSaved(`Deleted certificate ${code}`);
      reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete certificate');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <View style={s.regHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <IconBox size={34}><FolderOpen size={16} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1 }}>
              <Text style={s.regTitle}>Certificate Registry</Text>
              <Text style={s.regSub}>
                Browse every certificate in the system. Search by recipient, code, roll
                number, or branch — click any entry to open its public verify page.
              </Text>
            </View>
          </View>
          {typeof total === 'number' && (
            <View style={s.countPill}>
              <Text style={s.countText}>{total} total</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[s.inputRow, { flex: 1 }]}>
            <Search size={15} color={SAC.muted} />
            <TextInput
              value={q}
              onChangeText={(t) => { setQ(t); }}
              onSubmitEditing={reload}
              placeholder="Search name, code, roll no…"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.input}
            />
          </View>
          <GradientButton onPress={reload} loading={loading} size="sm">
            <View style={s.btnInner}><Search size={14} color="#fff" /><Text style={s.btnTextSm}>Search Registry</Text></View>
          </GradientButton>
          <Pressable onPress={reload} style={s.refreshBtn}>
            <RefreshCw size={14} color="#A78BFA" />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {branches.map((b) => (
            <Pressable
              key={b}
              onPress={() => { setBranch(b); setItems([]); setTimeout(reload, 0); }}
              style={[s.filterChip, branch === b && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, branch === b && s.filterChipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {loading && !items.length && (
          <View style={s.emptyBox}>
            <ActivityIndicator color="#A78BFA" />
            <Text style={s.emptyText}>Loading registry…</Text>
          </View>
        )}

        {!loading && items.length === 0 && (
          <View style={s.emptyBox}>
            <FolderOpen size={22} color="#475569" />
            <Text style={s.emptyText}>
              {total === 0 ? 'No certificates in the registry yet.' : 'No results match your filters.'}
            </Text>
          </View>
        )}

        {items.length > 0 && (
          <ScrollView style={{ maxHeight: 480 }} nestedScrollEnabled>
            {items.map((c) => {
              const id: string = c?.id || c?.certificate_id || c?.verification_code || '';
              const code: string = c?.verification_code || c?.certificate_id || c?.id || id;
              const name: string = c?.recipient_name || c?.recipient_email || '—';
              const title: string = c?.title || c?.certification_name || '';
              const img: string | null = c?.image_url ? resolveImageUrl(c.image_url) : null;
              return (
                <View key={c?._id || id || Math.random()} style={s.regRow}>
                  {img ? (
                    <View style={s.thumbWrap}>
                      <img
                        src={img}
                        alt="cert"
                        style={{
                          width: 44, height: 44, borderRadius: 8, objectFit: 'cover',
                          display: 'block', background: '#0f172a',
                        }}
                      />
                    </View>
                  ) : (
                    <View style={s.thumbPlaceholder}>
                      <FileText size={18} color="#475569" />
                    </View>
                  )}

                  <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.regName}>{name}</Text>
                    {title ? <Text numberOfLines={1} style={s.regTitleText}>{title}</Text> : null}
                    <Text numberOfLines={1} style={[s.mono, s.regCode]}>{code || id || '—'}</Text>
                    {c?.branch ? <Text style={s.regMeta}>{c.branch}</Text> : null}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => Linking.openURL(`${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai'}/certificates/verify/${encodeURIComponent(id || code)}`)}
                      style={s.regLinkBtn}
                    >
                      <ExternalLink size={13} color="#A78BFA" />
                      <Text style={s.regLinkText}>Verify</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => copyUrl(id || code)}
                      style={s.regCopyBtn}
                    >
                      <Copy size={12} color="#64748b" />
                      <Text style={s.regCopyText}>{copied === (id || code) ? 'Copied!' : 'Copy link'}</Text>
                    </Pressable>
                    <Pressable
                      disabled={deleting === (id || code)}
                      onPress={() => doDelete(id || code)}
                      style={[s.regLinkBtn, { borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.08)' }]}
                    >
                      {deleting === (id || code) ? (
                        <ActivityIndicator size={11} color="#F87171" />
                      ) : (
                        <Trash2 size={13} color="#F87171" />
                      )}
                      <Text style={[s.regLinkText, { color: '#F87171' }]}>
                        {deleting === (id || code) ? 'Deleting…' : 'Delete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {total !== null && total > 0 && (
          <View style={s.pagination}>
            <Pressable style={s.pageBtn} onPress={() => load(page - 1)} disabled={page <= 1 || loading}>
              <Text style={s.pageBtnText}>Prev</Text>
            </Pressable>
            <Text style={s.pageInfo}>Page {page} of {Math.ceil(total / LIMIT)}</Text>
            <Pressable style={s.pageBtn} onPress={() => load(page + 1)} disabled={page >= Math.ceil(total / LIMIT) || loading}>
              <Text style={s.pageBtnText}>Next</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  ISSUE TAB — single platform certificate
 * ══════════════════════════════════════════════════════════════════ */
function IssueTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('Student Alumni');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const issue = async () => {
    setError(null); setResult(null);
    if (!email.trim() || !title.trim()) { setError('Recipient email and certificate title are required.'); return; }
    setBusy(true);
    try {
      const r = await request('/certificates/issue', {
        method: 'POST',
        body: JSON.stringify({ recipient_email: email.trim(), title: title.trim(), issuer: issuer.trim() || 'Student Alumni' }),
      });
      setResult(r);
      onSaved('Certificate issued');
    } catch (e: any) {
      setError(e.message || 'Failed to issue certificate');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <SectionLabel text="Issue Platform Certificate" />
        <Text style={s.hint}>
          Generates a unique SA-XXXX-XXXX verification code, stores it in the registry,
          and returns a public /certificates/verify/{'{code}'} URL. Anyone can validate it — no login needed.
        </Text>

        <View style={s.field}>
          <Text style={s.label}>Recipient Email *</Text>
          <View style={s.inputRow}>
            <Mail size={15} color={SAC.muted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@college.edu"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="email-address"
              style={s.input}
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Certificate Title *</Text>
          <View style={s.inputRow}>
            <Award size={15} color={SAC.muted} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Data Structures & Algorithms Workshop"
              placeholderTextColor="#475569"
              style={s.input}
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Issuer</Text>
          <View style={s.inputRow}>
            <Sparkles size={15} color={SAC.muted} />
            <TextInput
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Student Alumni"
              placeholderTextColor="#475569"
              style={s.input}
            />
          </View>
        </View>

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <GradientButton onPress={issue} loading={busy}>
          <View style={s.btnInner}><Award size={15} color="#fff" /><Text style={s.btnText}>{busy ? 'Issuing...' : 'Issue Certificate'}</Text></View>
        </GradientButton>

        {result && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>Issued successfully</Text>
            </View>
            <InfoRow label="Code" value={result.verification_code} mono />
            <InfoRow label="Recipient" value={result.recipient_name} />
            <InfoRow label="Verify URL" value={result.verify_url} mono />
            {result.verify_url && (
              <Pressable
                onPress={() => Linking.openURL(result.verify_url)}
                style={({ hovered }: any) => [s.linkBtn, hovered && { borderColor: '#A78BFA' }]}
              >
                <ExternalLink size={14} color="#A78BFA" />
                <Text style={s.linkBtnText}>Open verify page</Text>
              </Pressable>
            )}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  BULK TAB — paste rows: email|title per line
 * ══════════════════════════════════════════════════════════════════ */
function BulkTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [rows, setRows] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const parseRows = () =>
    rows.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [email, ...rest] = line.split('|').map((p) => p.trim());
      return { recipient_email: email || '', title: rest.join('|').trim() };
    }).filter((x) => x.recipient_email && x.title);

  const issue = async () => {
    setError(null); setResult(null);
    const items = parseRows();
    if (!items.length) { setError('Paste at least one row in "email | title" format.'); return; }
    setBusy(true);
    try {
      const r = await request('/certificates/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      setResult(r);
      onSaved(`${r.created} certificates issued`);
    } catch (e: any) {
      setError(e.message || 'Failed to bulk issue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <SectionLabel text="Bulk Issue (up to 1000)" />
        <Text style={s.hint}>
          One recipient per line, format <Text style={s.mono}>email | certificate title</Text>. Every
          row gets its own unique SA code and is immediately verifiable.
        </Text>

        <TextInput
          value={rows}
          onChangeText={setRows}
          placeholder={'student1@college.edu | AI & ML Bootcamp\nstudent2@college.edu | Web Dev Workshop'}
          placeholderTextColor="#475569"
          multiline
          style={[s.input, s.textarea]}
        />

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <GradientButton onPress={issue} loading={busy}>
          <View style={s.btnInner}><Upload size={15} color="#fff" /><Text style={s.btnText}>{busy ? 'Issuing...' : `Issue ${parseRows().length} Certificate${parseRows().length === 1 ? '' : 's'}`}</Text></View>
        </GradientButton>

        {result && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>{result.created} certificates issued</Text>
            </View>
            <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
              {(result.certificates || []).map((c: any, i: number) => (
                <View key={i} style={s.bulkRow}>
                  <Text style={[s.mono, { color: '#A78BFA' }]}>{c.verification_code}</Text>
                  <Text style={s.bulkEmail} numberOfLines={1}>{c.recipient_email}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  FILES TAB — upload certificate files (PNG/JPEG/WEBP/PDF)
 * ══════════════════════════════════════════════════════════════════ */
function FilesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const bulkRef = React.useRef<HTMLInputElement>(null);

  const pickSingle = () => inputRef.current?.click();
  const pickBulk = () => bulkRef.current?.click();

  const onSingleFile = (e: any) => {
    const f = e?.target?.files?.[0];
    if (f) setFiles([f]);
  };

  const onBulkFiles = (e: any) => {
    const list = Array.from(e?.target?.files || []) as File[];
    if (list.length) setFiles(list);
  };

  const uploadSingle = async () => {
    setError(null); setResult(null);
    if (!email.trim() || !title.trim()) { setError('Recipient email and certificate title are required.'); return; }
    if (!files.length) { setError('Choose a certificate file first.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      fd.append('recipient_email', email.trim());
      fd.append('title', title.trim());
      fd.append('issuer', 'Student Alumni');
      const r = await request('/certificates/upload', { method: 'POST', body: fd });
      setResult(r);
      onSaved(`Uploaded + issued ${r.verification_code}`);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadBulk = async () => {
    setError(null); setResult(null);
    if (!files.length) { setError('Choose at least one certificate file.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const r = await request('/certificates/upload-bulk', { method: 'POST', body: fd });
      setResult(r);
      onSaved(`${r.created} uploaded and issued`);
      setFiles([]);
    } catch (e: any) {
      setError(e.message || 'Bulk upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <SectionLabel text="Upload Certificate Files" />
        <Text style={s.hint}>
          Accepts PNG, JPG, JPEG, WEBP, and PDF (max 15 MB each). Each file becomes a
          verifiable registry entry with its own SA-XXXX-XXXX code and is displayed on
          the recipient's public verify page.
        </Text>

        <View style={s.seg}>
          {(['single', 'bulk'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setResult(null); setError(null); }}
              style={[s.segBtn, mode === m && s.segActive]}
            >
              <Text style={[s.segText, mode === m && s.segTextActive]}>{m === 'single' ? 'Single file' : 'Bulk files'}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'single' && (
          <>
            <View style={s.field}>
              <Text style={s.label}>Recipient Email *</Text>
              <View style={s.inputRow}>
                <Mail size={15} color={SAC.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@college.edu"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={s.input}
                />
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Certificate Title *</Text>
              <View style={s.inputRow}>
                <Award size={15} color={SAC.muted} />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. AI & ML Bootcamp"
                  placeholderTextColor="#475569"
                  style={s.input}
                />
              </View>
            </View>
          </>
        )}

        <Pressable onPress={mode === 'single' ? pickSingle : pickBulk} style={({ hovered }: any) => [s.dropZone, hovered && { borderColor: '#A78BFA' }]}>
          <FileUp size={20} color="#A78BFA" />
          <Text style={s.dropTitle}>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Choose certificate file(s)'}</Text>
          <Text style={s.dropSub}>
            {mode === 'single'
              ? 'PNG · JPG · WEBP · PDF · up to 15 MB'
              : 'Multi-select. Name each file "{email}__{title}.{ext}" — e.g. john@college.edu__AI Bootcamp.pdf'}
          </Text>
        </Pressable>

        {Platform.OS === 'web' && (
          <>
            <input
              ref={inputRef as any}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              style={{ display: 'none' }}
              onChange={onSingleFile}
            />
            <input
              ref={bulkRef as any}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              style={{ display: 'none' }}
              onChange={onBulkFiles}
            />
          </>
        )}

        {files.length > 0 && (
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {files.map((f, i) => (
              <View key={i} style={s.fileRow}>
                <FileText size={14} color={SAC.muted} />
                <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
                <Text style={s.fileSize}>{(f.size / 1024 / 1024).toFixed(1)} MB</Text>
                <Pressable onPress={() => setFiles(files.filter((_, j) => j !== i))}>
                  <X size={14} color={SAC.muted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <GradientButton onPress={mode === 'single' ? uploadSingle : uploadBulk} loading={busy} disabled={!files.length}>
          <View style={s.btnInner}><Upload size={15} color="#fff" /><Text style={s.btnText}>{busy ? 'Uploading...' : mode === 'single' ? 'Upload & Issue Certificate' : `Upload & Issue ${files.length} Certificate${files.length === 1 ? '' : 's'}`}</Text></View>
        </GradientButton>

        {result && mode === 'single' && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>Uploaded & issued</Text>
            </View>
            <InfoRow label="Code" value={result.verification_code} mono />
            <InfoRow label="Recipient" value={result.recipient_name} />
            <InfoRow label="Verify URL" value={result.verify_url} mono />
            {result.verify_url && (
              <Pressable
                onPress={() => Linking.openURL(result.verify_url)}
                style={({ hovered }: any) => [s.linkBtn, hovered && { borderColor: '#A78BFA' }]}
              >
                <ExternalLink size={14} color="#A78BFA" />
                <Text style={s.linkBtnText}>Open verify page</Text>
              </Pressable>
            )}
          </View>
        )}

        {result && mode === 'bulk' && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>{result.created} uploaded & issued</Text>
            </View>
            {(result.certificates || []).length > 0 && (
              <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
                {(result.certificates || []).map((c: any, i: number) => (
                  <View key={i} style={s.bulkRow}>
                    <Text style={[s.mono, { color: '#A78BFA' }]}>{c.verification_code}</Text>
                    <Text style={s.bulkEmail} numberOfLines={1}>{c.recipient_email}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            {(result.errors || []).length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.hint, { marginBottom: 6 }]}>{result.errors.length} file(s) could not be processed:</Text>
                {(result.errors || []).map((e: any, i: number) => (
                  <Text key={i} numberOfLines={2} style={[s.errorText, { color: '#F87171' }]}>
                    {e.filename || '(unknown)'}: {e.error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  EXTERNAL TAB — store third-party cert with classification
 * ══════════════════════════════════════════════════════════════════ */
function ExternalTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [classification, setClassification] = useState<any>(null);
  const [classifying, setClassifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = async () => {
    setError(null); setClassification(null);
    if (!url.trim()) { setError('Paste a credential URL first.'); return; }
    setClassifying(true);
    try {
      const r = await request('/certificates/classify', {
        method: 'POST',
        body: JSON.stringify({ credential_url: url.trim() }),
      });
      setClassification(r);
    } catch (e: any) {
      setError(e.message || 'Classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const store = async () => {
    setError(null);
    if (!email.trim() || !title.trim() || !url.trim()) { setError('Recipient, title, and credential URL are required.'); return; }
    setBusy(true);
    try {
      await request('/certificates/external', {
        method: 'POST',
        body: JSON.stringify({ recipient_email: email.trim(), title: title.trim(), credential_url: url.trim() }),
      });
      onSaved('External certificate stored');
      setEmail(''); setTitle(''); setUrl(''); setClassification(null);
    } catch (e: any) {
      setError(e.message || 'Failed to store');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <SectionLabel text="Store Third-Party Certificate" />
        <Text style={s.hint}>
          For credentials issued by Udemy, Coursera, LinkedIn, CodeSpectra, edX, etc. We classify
          the issuer from the URL and deep-link the verify page to the source — we cannot
          cryptographically verify third-party certs, only the issuing platform can.
        </Text>

        <View style={s.field}>
          <Text style={s.label}>Recipient Email *</Text>
          <View style={s.inputRow}>
            <Mail size={15} color={SAC.muted} />
            <TextInput value={email} onChangeText={setEmail} placeholder="student@college.edu" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" style={s.input} />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Certificate Title *</Text>
          <View style={s.inputRow}>
            <Award size={15} color={SAC.muted} />
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Python for Everybody" placeholderTextColor="#475569" style={s.input} />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Credential URL *</Text>
          <View style={s.inputRow}>
            <Link2 size={15} color={SAC.muted} />
            <TextInput value={url} onChangeText={setUrl} placeholder="https://www.udemy.com/certificate/UC-..." placeholderTextColor="#475569" autoCapitalize="none" autoCorrect={false} style={s.input} />
            <Pressable onPress={classify} style={s.miniBtn}>
              {classifying ? <ActivityIndicator size={12} color="#A78BFA" /> : <Sparkles size={14} color="#A78BFA" />}
            </Pressable>
          </View>
        </View>

        {classification && (
          <View style={s.classBox}>
            <Text style={s.classLabel}>Detected issuer</Text>
            <View style={s.classHead}>
              <ShieldCheck size={14} color="#34D399" />
              <Text style={s.classIssuer}>{classification.issuer}</Text>
            </View>
            <Text style={s.classHint}>{classification.hint}</Text>
            <View style={s.classRow}>
              <Text style={s.classKey}>Key</Text>
              <Text style={[s.mono, { color: '#94a3b8' }]}>{classification.issuer_key}</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <GradientButton onPress={store} loading={busy}>
          <View style={s.btnInner}><ExternalLink size={15} color="#fff" /><Text style={s.btnText}>{busy ? 'Saving...' : 'Store Certificate'}</Text></View>
        </GradientButton>
      </Card>
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  VERIFY TAB — check any code / recipient
 * ══════════════════════════════════════════════════════════════════ */
function VerifyTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [list, setList] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setError(null); setResult(null); setNotFound(false);
    const c = code.trim().toUpperCase();
    if (!c) { setError('Enter a verification code.'); return; }
    setBusy(true);
    try {
      const r = await request(`/certificates/verify/${encodeURIComponent(c)}`);
      setResult(r);
    } catch {
      setNotFound(true);
    } finally {
      setBusy(false);
    }
  };

  const byRecipient = async () => {
    setError(null); setList(null); setResult(null); setNotFound(false);
    if (!email.trim()) { setError('Enter a recipient email.'); return; }
    setBusy(true);
    try {
      const r = await request(`/certificates/recipient/${encodeURIComponent(email.trim().toLowerCase())}`);
      setList(r.certificates || []);
      if (!r.certificates?.length) setNotFound(true);
    } catch (e: any) {
      setError(e.message || 'Lookup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <Card>
        <SectionLabel text="Verify a Certificate" />
        <Text style={s.hint}>
          Confirm a platform certificate by its SA-XXXX-XXXX code, or list all certificates
          issued to a recipient by email.
        </Text>

        <View style={s.field}>
          <Text style={s.label}>Verification Code</Text>
          <View style={s.inputRow}>
            <ShieldCheck size={15} color={SAC.muted} />
            <TextInput value={code} onChangeText={setCode} placeholder="SA-ABCD-1234" placeholderTextColor="#475569" autoCapitalize="characters" autoCorrect={false} style={[s.input, s.monoInput]} />
            <GradientButton onPress={lookup} loading={busy} size="sm">
              <View style={s.btnInner}><Search size={14} color="#fff" /><Text style={s.btnTextSm}>Verify</Text></View>
            </GradientButton>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.field}>
          <Text style={s.label}>Or look up by recipient email</Text>
          <View style={s.inputRow}>
            <User size={15} color={SAC.muted} />
            <TextInput value={email} onChangeText={setEmail} placeholder="student@college.edu" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" style={s.input} />
            <GradientButton onPress={byRecipient} loading={busy} size="sm">
              <View style={s.btnInner}><Search size={14} color="#fff" /><Text style={s.btnTextSm}>Find</Text></View>
            </GradientButton>
          </View>
        </View>

        {error && (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {notFound && !result && (
          <View style={[s.resultBox, { borderColor: '#7F1D1D' }]}>
            <View style={s.resultHead}>
              <X size={16} color="#F87171" />
              <Text style={[s.resultTitle, { color: '#F87171' }]}>Not found</Text>
            </View>
            <Text style={s.hint}>No matching certificate in the registry.</Text>
          </View>
        )}

        {result && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>Valid certificate</Text>
            </View>
            <InfoRow label="Code" value={result.verification_code} mono />
            <InfoRow label="Recipient" value={result.recipient_name} />
            <InfoRow label="Email" value={result.recipient_email} />
            <InfoRow label="Title" value={result.title} />
            <InfoRow label="Issuer" value={result.issuer} />
            <InfoRow label="Type" value={result.issuer_type} />
            {result.issued_at && <InfoRow label="Issued" value={new Date(result.issued_at).toLocaleDateString()} />}
            {(result.verify_url || result.credential_url) && (
              <Pressable
                onPress={() => Linking.openURL(result.verify_url || result.credential_url)}
                style={({ hovered }: any) => [s.linkBtn, hovered && { borderColor: '#A78BFA' }]}
              >
                <ExternalLink size={14} color="#A78BFA" />
                <Text style={s.linkBtnText}>Open verify page</Text>
              </Pressable>
            )}
          </View>
        )}

        {list && list.length > 0 && (
          <View style={s.resultBox}>
            <View style={s.resultHead}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={s.resultTitle}>{list.length} certificate{list.length === 1 ? '' : 's'} found</Text>
            </View>
            {list.map((c: any, i: number) => (
              <View key={i} style={s.bulkRow}>
                <Text style={[s.mono, { color: '#A78BFA' }]}>{c.verification_code || '—'}</Text>
                <Text style={s.bulkEmail} numberOfLines={1}>{c.title}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

/* ── small shared bits ─────────────────────────────────────────────── */
function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={[s.infoValue, mono && s.monoValue]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 19 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6, lineHeight: 19, maxWidth: 620 },
  hint: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { color: '#cbd5e1', fontFamily: FONTS.bold, fontSize: 11.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12 },
  input: { flex: 1, color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 13, paddingVertical: 12 },
  textarea: { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 },
  monoInput: { fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, letterSpacing: 0.6 },
  mono: { fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 12 },
  monoValue: { fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 11.5, color: '#A78BFA' },
  miniBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12, flex: 1 },
  resultBox: { marginTop: 14, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 14 },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultTitle: { color: '#34D399', fontFamily: FONTS.xbold, fontSize: 13.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  infoLabel: { width: 84, color: '#64748b', fontFamily: FONTS.bold, fontSize: 11, paddingTop: 2 },
  infoValue: { flex: 1, color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)', alignSelf: 'flex-start', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  linkBtnText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(30,41,59,0.6)' },
  bulkEmail: { flex: 1, color: '#cbd5e1', fontFamily: FONTS.med, fontSize: 12 },
  classBox: { marginBottom: 12, backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: 10, padding: 12 },
  classLabel: { color: '#64748b', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  classHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  classIssuer: { color: '#34D399', fontFamily: FONTS.xbold, fontSize: 13 },
  classHint: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17, marginTop: 6 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  classKey: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11 },
  divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 14 },
  seg: { flexDirection: 'row', gap: 8, marginBottom: 14, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segActive: { backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' },
  segText: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 12.5 },
  segTextActive: { color: '#c4b5fd' },
  dropZone: { alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#334155', borderRadius: 12, paddingVertical: 26, paddingHorizontal: 16, marginBottom: 14, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  dropTitle: { color: '#cbd5e1', fontFamily: FONTS.bold, fontSize: 13 },
  dropSub: { color: '#64748b', fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(30,41,59,0.6)' },
  fileName: { flex: 1, color: '#cbd5e1', fontFamily: FONTS.med, fontSize: 12 },
  fileSize: { color: '#64748b', fontFamily: FONTS.med, fontSize: 11 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  btnTextSm: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  regHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  regTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  regSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18, marginTop: 4 },
  countPill: { backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  countText: { color: '#c4b5fd', fontFamily: FONTS.xbold, fontSize: 11.5 },
  regFilters: { gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  filterChipActive: { borderColor: 'rgba(167,139,250,0.5)', backgroundColor: 'rgba(167,139,250,0.14)' },
  filterChipText: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11.5 },
  filterChipTextActive: { color: '#c4b5fd' },
  refreshBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  emptyText: { color: '#64748b', fontFamily: FONTS.med, fontSize: 12.5 },
  regRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(30,41,59,0.6)' },
  thumbWrap: { width: 44, height: 44 },
  thumbPlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  regName: { color: '#e2e8f0', fontFamily: FONTS.xbold, fontSize: 13 },
  regTitleText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 11.5 },
  regCode: { color: '#A78BFA', fontSize: 10.5 },
  regMeta: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 10 },
  regLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  regLinkText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 10.5 },
  regCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  regCopyText: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 10.5 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
