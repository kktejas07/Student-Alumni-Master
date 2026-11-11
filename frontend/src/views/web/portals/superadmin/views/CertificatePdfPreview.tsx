/**
 * Certificate PDF preview (CR2).
 *
 * Renders the exact PDF the server will issue — fpdf2 layout with the
 * verification QR code embedded — before anything is written to the
 * registry. The QR encodes the public /certificates/verify/{code} URL, so
 * scanning the printed certificate lands on the verification page.
 *
 * Nothing here persists a certificate; /certificates/preview-pdf is a
 * pure render endpoint.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import {
  QrCode, FileText, RefreshCw, ExternalLink, Download, X, ShieldCheck,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Card, GradientButton } from '../applekit';
import { request } from '@/src/models/services/api';

interface PreviewResult {
  pdf_base64: string;
  qr_data_uri: string;
  verify_url: string;
  verification_code: string;
  byte_size: number;
}

function base64ToBlobUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export function CertificatePdfPreview({
  body,
  reloadKey = 0,
  onClose,
}: {
  body: any;
  reloadKey?: number;
  onClose?: () => void;
}) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r: any = await request('/certificates/preview-pdf', {
        method: 'POST',
        auth: true,
        body,
      });
      setResult({
        pdf_base64: r.pdf_base64,
        qr_data_uri: r.qr_data_uri,
        verify_url: r.verify_url,
        verification_code: r.verification_code,
        byte_size: r.byte_size,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to render PDF preview');
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(body)]);

  useEffect(() => {
    if (reloadKey > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  const openPdf = () => {
    if (!result?.pdf_base64) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = base64ToBlobUrl(result.pdf_base64);
    blobUrlRef.current = url;
    window.open(url, '_blank');
  };

  const downloadPdf = () => {
    if (!result?.pdf_base64) return;
    const url = base64ToBlobUrl(result.pdf_base64);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.verification_code || 'certificate'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <Card>
      <View style={s.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <QrCode size={16} color={SAC.accent} />
          <Text style={s.title}>PDF Preview with Verification QR</Text>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={s.closeBtn}>
            <X size={14} color={SAC.muted} />
          </Pressable>
        )}
      </View>

      <Text style={s.hint}>
        Rendered server-side with fpdf2 — the QR code links to the public
        verification page. Nothing is saved until you issue the certificate.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <GradientButton onPress={load} loading={busy} size="sm">
          <View style={s.btnInner}>
            <RefreshCw size={13} color="#fff" />
            <Text style={s.btnText}>{result ? 'Re-render' : 'Render Preview'}</Text>
          </View>
        </GradientButton>
        {result && (
          <>
            <Pressable onPress={openPdf} style={s.ghostBtn}>
              <ExternalLink size={13} color="#A78BFA" />
              <Text style={s.ghostText}>Open PDF</Text>
            </Pressable>
            <Pressable onPress={downloadPdf} style={s.ghostBtn}>
              <Download size={13} color="#A78BFA" />
              <Text style={s.ghostText}>Download</Text>
            </Pressable>
          </>
        )}
      </View>

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {busy && !result && (
        <View style={s.emptyBox}>
          <ActivityIndicator color="#A78BFA" />
          <Text style={s.emptyText}>Rendering PDF…</Text>
        </View>
      )}

      {result && (
        <View style={{ gap: 12 }}>
          <View style={s.metaRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.metaKey}>Verification Code</Text>
              <Text style={s.mono}>{result.verification_code}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.metaKey}>Verify URL</Text>
              <Text style={s.mono} numberOfLines={1}>{result.verify_url}</Text>
            </View>
            <View>
              <Text style={s.metaKey}>Size</Text>
              <Text style={s.mono}>{Math.max(1, Math.round(result.byte_size / 1024))} KB</Text>
            </View>
          </View>

          <View style={s.split}>
            {/* QR */}
            <View style={s.qrPane}>
              <Text style={s.paneLabel}>Verification QR</Text>
              <img
                src={result.qr_data_uri}
                alt="Verification QR code"
                style={{ width: 168, height: 168, borderRadius: 8, background: '#fff', padding: 8, display: 'block' }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <ShieldCheck size={13} color="#34D399" />
                <Text style={s.qrCaption}>Scans to /certificates/verify/{result.verification_code}</Text>
              </View>
            </View>

            {/* PDF frame */}
            <View style={s.pdfPane}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileText size={13} color={SAC.muted} />
                <Text style={s.paneLabel}>Rendered PDF (A4 landscape)</Text>
              </View>
              {Platform.OS === 'web' && (
                <iframe
                  title="Certificate PDF preview"
                  src={`data:application/pdf;base64,${result.pdf_base64}`}
                  style={{
                    width: '100%',
                    height: 380,
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    background: '#0f172a',
                  }}
                />
              )}
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  hint: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17, marginBottom: 12 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  ghostText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, padding: 10, marginBottom: 10 },
  errorText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  emptyText: { color: '#64748b', fontFamily: FONTS.med, fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  metaKey: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  mono: { color: '#A78BFA', fontFamily: (Platform.OS === 'web' ? 'SpaceMono, "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 11 },
  split: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  qrPane: { flexGrow: 0, flexBasis: 200, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  paneLabel: { color: '#64748b', fontFamily: FONTS.xbold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  qrCaption: { color: '#34D399', fontFamily: FONTS.med, fontSize: 10, flex: 1 },
  pdfPane: { flexGrow: 1, flexBasis: 320, padding: 12, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
});
