// the shared media library panel — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';
import { Card, GRAD, GradientButton, SearchField, useToast } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { Check, Copy, FileText, HardDrive, Images, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react-native';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tip, cs } from '../fields/echoCmsFields';

export function MediaLibraryPanel() {
  const { confirm } = useConfirm();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totalInfo, setTotalInfo] = useState<{ total: number; total_size_human: string }>({ total: 0, total_size_human: '0 B' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const { flash } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listEchoMedia();
      setMedia(res?.items || []);
      setTotalInfo({ total: res?.total || 0, total_size_human: res?.total_size_human || '0 B' });
    } catch {
      flash('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = media.filter((m) =>
    !search || m.filename.toLowerCase().includes(search.toLowerCase()) ||
    (m.original_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const images = filtered.filter((m) => m.is_image);
  const docs = filtered.filter((m) => !m.is_image);

  const copyUrl = (url: string) => {
    if (Platform.OS === 'web') {
      const full = resolveImageUrl(url);
      navigator.clipboard?.writeText(full).catch(() => {});
    }
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const onDelete = async (filename: string) => {
    const ok = await confirm({
      title: 'Delete file',
      message: `Delete ${filename}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setDeleting(filename);
    try {
      await api.deleteEchoMedia(filename);
      flash('File deleted');
      await load();
    } catch {
      flash('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    setUploading(true);
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1}/${files.length}…`);
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append('file', file, file.name);
        await api.uploadEchoMedia(fd);
        count++;
      } catch { /* skip failed */ }
    }
    setUploading(false);
    setUploadProgress('');
    flash(`${count} file${count !== 1 ? 's' : ''} uploaded`);
    await load();
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: SAC.text }}>Media Library</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            {totalInfo.total} files · {totalInfo.total_size_human} total
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {Platform.OS === 'web' && (
            <label style={{ cursor: 'pointer' }}>
              <View>
                <GradientButton size="md">
                  <Upload size={13} color="#fff" />
                  <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>
                    {uploading ? uploadProgress : 'Bulk Upload'}
                  </Text>
                </GradientButton>
              </View>
              <input type="file" multiple accept="image/*,.pdf,.docx,.xlsx,.pptx" style={{ display: 'none' }}
                onChange={(e: any) => { if (e.target.files?.length > 0) handleBulkUpload(e.target.files); }} />
            </label>
          )}
          <Tip label="Refresh files"><Pressable onPress={load} style={[cs.iconBtn, { width: 34, height: 34 }]}>
            <RefreshCw size={15} color={SAC.muted} />
          </Pressable></Tip>
        </View>
      </View>

      {/* Search */}
      <SearchField value={search} onChange={setSearch} placeholder="Search files…" width="100%" />

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GRAD.from} />
        </View>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 32, alignItems: 'center', gap: 10 }}>
          <HardDrive size={28} color={SAC.dim} />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>No files uploaded yet</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Upload images and documents to use in your showcases.
          </Text>
        </Card>
      ) : (
        <>
          {/* Images grid */}
          {images.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 1 }}>
                IMAGES ({images.length})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {images.map((m) => (
                  <Pressable key={m.filename} onPress={() => setPreview(m)}
                    style={{ width: 120, borderRadius: 10, overflow: 'hidden',
                      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border }}>
                    <Image
                      source={{ uri: resolveImageUrl(m.url) }}
                      style={{ width: 120, height: 80 }} resizeMode="cover"
                    />
                    <View style={{ padding: 6, gap: 3 }}>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9.5, color: SAC.muted }} numberOfLines={1}>
                        {m.original_name || m.filename}
                      </Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>{m.size_human}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Docs list */}
          {docs.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 1 }}>
                DOCUMENTS ({docs.length})
              </Text>
              {docs.map((m) => (
                <View key={m.filename} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10,
                  borderWidth: 1, borderColor: SAC.border }}>
                  <FileText size={20} color={GRAD.from} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>{m.original_name || m.filename}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{m.size_human} · {m.ext.toUpperCase()}</Text>
                  </View>
                  <Tip label="Copy URL">
                    <Pressable onPress={() => copyUrl(m.url)} style={cs.iconBtn}>
                      {copiedUrl === m.url ? <Check size={13} color="#34D399" /> : <Copy size={13} color={SAC.muted} />}
                    </Pressable>
                  </Tip>
                  <Tip label="Delete file">
                    <Pressable onPress={() => onDelete(m.filename)}
                      style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                      {deleting === m.filename ? <ActivityIndicator size={10} color="#F87171" /> : <Trash2 size={13} color="#F87171" />}
                    </Pressable>
                  </Tip>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Image preview modal */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: SAC.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPreview(null)} />
          {preview && (
            <View style={{ width: '90%', maxWidth: 700, backgroundColor: '#101019',
              borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: SAC.border, zIndex: 2 }}>
              <Image
                source={{ uri: resolveImageUrl(preview.url) }}
                style={{ width: '100%', height: 380 }} resizeMode="contain"
              />
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{preview.original_name || preview.filename}</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>
                  {preview.size_human} · {preview.ext.toUpperCase()} · Uploaded {new Date(preview.uploaded_at).toLocaleDateString()}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => copyUrl(preview.url)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, flex: 1 }}>
                    {copiedUrl === preview.url ? <Check size={14} color="#34D399" /> : <Copy size={14} color={SAC.muted} />}
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                      {copiedUrl === preview.url ? 'Copied!' : 'Copy URL'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => { onDelete(preview.filename); setPreview(null); }}
                    style={{ alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8, padding: 8, paddingHorizontal: 14 }}>
                    <Trash2 size={15} color="#F87171" />
                  </Pressable>
                  <Pressable onPress={() => setPreview(null)}
                    style={{ alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, paddingHorizontal: 14 }}>
                    <X size={15} color={SAC.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Showcase Card ─────────────────────────────────────────────────────────────
