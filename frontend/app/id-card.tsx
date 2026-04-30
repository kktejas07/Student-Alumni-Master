/**
 * DigitalIDCard — premium glass-morphism card with QR, photo, status, SA-ID.
 *
 * Wired to GET /api/users/me/id-card (lazy-assigns SA-ID on first call).
 * Public verification endpoint: GET /api/id-cards/{sa_id}.
 *
 * Web: shows large card centered with Download (HTML2Canvas) + Share buttons.
 * Mobile: scaled card, Share via native share sheet.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
  Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Download, Share2, ShieldCheck, MapPin, GraduationCap, Calendar,
  ArrowLeft, Sparkles,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { request } from '@/src/models/services/api';
import { Colors as C } from '@/src/theme';

interface IDCard {
  sa_id: string;
  full_name: string;
  email: string;
  role: string;
  status: { label: string; color: string };
  institution: string;
  branch: string;
  batch?: string;
  city?: string;
  state?: string;
  photo_data?: string;
  linkedin_url?: string;
  issued_at: string;
  verify_url: string;
  qr_payload: string;
}

export default function DigitalIDScreen() {
  const router = useRouter();
  const [card, setCard] = useState<IDCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await request<IDCard>('/users/me/id-card');
      setCard(r);
    } catch (e: any) {
      setErr(e.message || 'Failed to load ID card');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    if (!card) return;
    const text = `Verify my Student-Alumni ID:\n\nName: ${card.full_name}\nSA-ID: ${card.sa_id}\nInstitution: ${card.institution}\nStatus: ${card.status.label}\n\nVerify at: ${card.verify_url}`;
    if (Platform.OS === 'web') {
      // Use Web Share API if available, else copy to clipboard
      if ((navigator as any).share) {
        try { await (navigator as any).share({ title: 'My SA Digital ID', text }); }
        catch { /* user cancelled */ }
      } else if ((navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(text);
        if (typeof window !== 'undefined') window.alert('Card details copied to clipboard');
      }
    } else {
      try { await Share.share({ message: text, title: 'My SA Digital ID' }); }
      catch { /* user cancelled */ }
    }
  };

  const handleDownload = async () => {
    if (Platform.OS !== 'web') return;
    setDownloading(true);
    try {
      // Use html2canvas if available; else fall back to print dialog.
      const html2canvas = (window as any).html2canvas;
      const node = (cardRef.current as any) as HTMLElement;
      if (html2canvas && node) {
        const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = `${card?.sa_id || 'id-card'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        // Fallback: trigger print
        if (typeof window !== 'undefined') window.print();
      }
    } catch (e) {
      console.error('download failed', e);
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading / Error
  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#A78BFA" size="large" />
          <Text style={styles.loadingText}>Generating your ID card…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (err || !card) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={styles.errText}>{err || 'No card available.'}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (card.full_name || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="id-back">
            <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Digital ID Card</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>
          Your verifiable Student-Alumni credential. Anyone scanning the QR code
          can confirm your identity.
        </Text>

        {/* THE CARD */}
        <View ref={cardRef as any} style={styles.cardWrap} collapsable={false} testID="id-card">
          <View style={styles.card}>
            {/* Top stripe with brand */}
            <View style={styles.cardHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>SA</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>STUDENT-ALUMNI</Text>
                  <Text style={styles.brandSubtitle}>NETWORK</Text>
                </View>
              </View>
              <View style={styles.verifiedChip}>
                <ShieldCheck size={11} color="#10B981" />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
              {/* Photo + identity */}
              <View style={styles.identityRow}>
                <View style={styles.photoWrap}>
                  {card.photo_data ? (
                    <View style={styles.photo}>
                      {/* Image base64 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.photo_data}
                        alt={card.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 } as any}
                      />
                    </View>
                  ) : (
                    <View style={[styles.photo, styles.photoFallback]}>
                      <Text style={styles.photoInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={[styles.statusChip, { backgroundColor: card.status.color + '24', borderColor: card.status.color + '70' }]}>
                    <Text style={[styles.statusText, { color: card.status.color }]}>
                      {card.status.label}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.nameLabel}>NAME</Text>
                  <Text style={styles.name} numberOfLines={2}>{card.full_name}</Text>
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.nameLabel}>SA-ID</Text>
                    <Text style={styles.saId} testID="id-sa-id">{card.sa_id}</Text>
                  </View>
                </View>
              </View>

              {/* Detail rows */}
              <View style={styles.detailGrid}>
                <DetailItem
                  icon={<GraduationCap size={13} color="rgba(255,255,255,0.55)" />}
                  label="INSTITUTION"
                  value={card.institution}
                />
                {!!card.branch && (
                  <DetailItem
                    icon={<Sparkles size={13} color="rgba(255,255,255,0.55)" />}
                    label="BRANCH"
                    value={card.branch}
                  />
                )}
                {!!card.batch && (
                  <DetailItem
                    icon={<Calendar size={13} color="rgba(255,255,255,0.55)" />}
                    label="BATCH"
                    value={card.batch}
                  />
                )}
                {(card.city || card.state) && (
                  <DetailItem
                    icon={<MapPin size={13} color="rgba(255,255,255,0.55)" />}
                    label="LOCATION"
                    value={[card.city, card.state].filter(Boolean).join(', ')}
                  />
                )}
              </View>

              {/* QR + footer */}
              <View style={styles.cardFooter}>
                <View style={styles.qrWrap}>
                  <QRCode
                    value={card.qr_payload}
                    size={104}
                    backgroundColor="white"
                    color="#0B0510"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 16, justifyContent: 'flex-end' }}>
                  <Text style={styles.footerLabel}>SCAN TO VERIFY</Text>
                  <Text style={styles.footerText} numberOfLines={1}>{card.verify_url}</Text>
                  <View style={{ height: 8 }} />
                  <Text style={styles.footerLabel}>ISSUED</Text>
                  <Text style={styles.footerText}>
                    {new Date(card.issued_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Hologram strip */}
            <View style={styles.hologramStrip} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {Platform.OS === 'web' && (
            <Pressable onPress={handleDownload} style={[styles.btn, styles.btnPrimary]} testID="id-download">
              <Download size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>{downloading ? 'Saving…' : 'Download PNG'}</Text>
            </Pressable>
          )}
          <Pressable onPress={handleShare} style={[styles.btn, styles.btnGhost]} testID="id-share">
            <Share2 size={16} color="#A78BFA" />
            <Text style={styles.btnGhostText}>Share</Text>
          </Pressable>
        </View>

        {/* Info note */}
        <View style={styles.note}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.noteText}>
            Anyone can scan the QR code to verify your SA-ID. Your phone, email, and personal data are never exposed by the QR code — only your name, role, and institution.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const CARD_BG    = '#130A28';
const CARD_GLOW  = 'rgba(167,139,250,0.18)';
const CARD_BORDER = 'rgba(167,139,250,0.30)';
const ACCENT     = '#A78BFA';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0C0818' },
  scroll: { padding: 18, paddingBottom: 60, alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 12 },
  errText: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ACCENT },
  retryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: 460, marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    ...({ cursor: 'pointer' } as any),
  },
  backText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  pageTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  subtitle: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular',
    fontSize: 12.5, lineHeight: 18, textAlign: 'center', maxWidth: 420, marginBottom: 22,
  },

  // ── Card
  cardWrap: {
    width: '100%', maxWidth: 420, alignItems: 'center', marginBottom: 22,
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER, borderWidth: 1,
    borderRadius: 22, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: `0 20px 60px ${CARD_GLOW}, 0 0 0 1px rgba(167,139,250,0.18) inset` } as any,
      default: {},
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderBottomColor: CARD_BORDER, borderBottomWidth: 1,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  brandTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.6 },
  brandSubtitle: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 9, letterSpacing: 1.2, marginTop: 2 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1,
  },
  verifiedText: { color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.8 },

  cardBody: { padding: 18, gap: 18 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  photoWrap: { alignItems: 'center', gap: 6 },
  photo: {
    width: 92, height: 92, borderRadius: 14,
    borderColor: CARD_BORDER, borderWidth: 1,
    overflow: 'hidden',
  },
  photoFallback: { backgroundColor: ACCENT + '24', alignItems: 'center', justifyContent: 'center' },
  photoInitials: { color: ACCENT, fontFamily: 'DMSans_800ExtraBold', fontSize: 30, letterSpacing: 1 },
  statusChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1, marginTop: 2,
  },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.8 },

  nameLabel: {
    color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_700Bold',
    fontSize: 9, letterSpacing: 1, marginBottom: 4,
  },
  name: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 19, lineHeight: 24 },
  saId: { color: ACCENT, fontFamily: 'DMSans_800ExtraBold', fontSize: 18, letterSpacing: 1 },

  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderTopColor: CARD_BORDER, borderTopWidth: 1, paddingTop: 14,
  },
  detailItem: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  detailLabel: {
    color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_700Bold',
    fontSize: 9, letterSpacing: 0.8,
  },
  detailValue: { color: 'rgba(255,255,255,0.90)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderTopColor: CARD_BORDER, borderTopWidth: 1, paddingTop: 14,
  },
  qrWrap: { padding: 6, backgroundColor: '#fff', borderRadius: 12 },
  footerLabel: {
    color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_700Bold',
    fontSize: 9, letterSpacing: 0.8, marginBottom: 4,
  },
  footerText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium', fontSize: 11 },

  hologramStrip: {
    height: 6, backgroundColor: ACCENT,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(90deg,#A78BFA 0%,#7B3DBF 50%,#A78BFA 100%)' } as any,
      default: {},
    }),
  },

  actions: {
    flexDirection: 'row', gap: 10, marginTop: 4,
    width: '100%', maxWidth: 420,
  },
  btn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    ...({ cursor: 'pointer' } as any),
  },
  btnPrimary: { backgroundColor: ACCENT },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  btnGhost: {
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  btnGhostText: { color: ACCENT, fontFamily: 'DMSans_700Bold', fontSize: 13 },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    width: '100%', maxWidth: 420, marginTop: 18,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: 'rgba(16,185,129,0.20)', borderWidth: 1,
  },
  noteText: {
    flex: 1, color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_400Regular', fontSize: 11.5, lineHeight: 17,
  },
});
