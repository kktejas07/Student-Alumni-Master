// TAB 7 — Digital ID (branded gradient ID card with copy/share/download) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, Image } from 'react-native';
import { UserCog, Lock, Copy, Share2, Download, QrCode, Building2, ShieldCheck } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { Card } from '@/src/views/web/portals/superadmin/applekit';
import { request } from '@/src/models/services/api';
import { GRAD_TO } from './settingsTokens';
import { s } from './settingsStyles';
import { FeatureCard, Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 7 — Digital ID
 * ═══════════════════════════════════════════════════════════════ */
export function DigitalIdTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    (async () => { try { setData(await request<any>('/admin/digital-id')); } catch {} })();
  }, []);

  const copyId = async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(data?.admin_id || '');
      }
      onSaved('Admin ID copied');
    } catch { onSaved('Copy failed'); }
  };

  const shareLink = async () => {
    try {
      const r = await request<any>('/admin/digital-id/share-link');
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(r.share_url);
      }
      onSaved('Share link copied');
    } catch { onSaved('Share link failed'); }
  };

  const downloadCard = async () => {
    try {
      const r = await request<{ qr_code_base64: string }>('/admin/digital-id');
      if (!r?.qr_code_base64) { onSaved('Download failed'); return; }
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${r.qr_code_base64}`;
        link.download = `admin-id-${data?.admin_id || 'unknown'}.png`;
        link.click();
      } else {
        onSaved('QR code available');
      }
    } catch { onSaved('Download failed'); }
  };

  if (!data) return <Loading />;

  const fmtDate = (iso: string) => {
    if (!iso) return 'N/A';
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 20 }}>
      {/* The ID Card — 3D CSS Flip */}
      <Pressable onPress={() => setFlipped(!flipped)} style={{ alignSelf: 'center', width: '100%', maxWidth: 540, ...(Platform.OS === 'web' ? { perspective: 1000, WebkitPerspective: 1000 } as any : {}) }}>
        <View style={{ position: 'relative', height: 440, width: '100%', transformStyle: 'preserve-3d' as any, ...(Platform.OS === 'web' ? { transition: 'transform 0.6s ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } as any : {}), ...(Platform.OS !== 'web' ? { opacity: flipped ? 0 : 1 } as any : {}) }}>
          {/* FRONT: Identity */}
          <View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any }}>
            <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
              <View style={{ position: 'absolute', top: -10, right: -10, opacity: 0.08 }}>
                <Text style={{ fontSize: 140, fontFamily: FONTS.xbold, color: '#1f1107', letterSpacing: -6 }}>SA</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={s.idOrg}>{(data.org || 'Student Alumni').toUpperCase()}</Text>
                    <Text style={s.idLabel}>{data.label || 'OFFICIAL ID'}</Text>
                  </View>
                  <View style={s.idBadge}>
                    <Text style={s.idBadgeText}>{(data.role_label || 'ADMIN').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' }}>
                    {data.photo ? (
                      <Image source={{ uri: data.photo }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                    ) : (
                      <UserCog size={28} color="rgba(31,17,7,0.5)" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.idName}>{data.name}</Text>
                    <Text style={s.idTitle}>{data.title} · {data.access_label}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 22 }}>
                  <View>
                    <Text style={s.idAdminLabel}>ADMIN ID</Text>
                    <Text style={s.idAdminVal}>{data.admin_id}</Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.idAdminLabel}>EMAIL</Text>
                    <Text style={{ color: 'rgba(31,17,7,0.8)', fontFamily: FONTS.xbold, fontSize: 13 }}>{data.email || ''}</Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.idAdminLabel}>ISSUED</Text>
                    <Text style={{ color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 12 }}>{fmtDate(data.issue_date)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={s.idFlipHint}>Tap for verification →</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* BACK: Verification — pre-rotated 180deg so it faces away when parent is at 0deg */}
          <View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any, transform: [{ rotateY: '180deg' }] }}>
            <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
              <View style={{ position: 'absolute', top: -10, right: -10, opacity: 0.08 }}>
                <Text style={{ fontSize: 140, fontFamily: FONTS.xbold, color: '#1f1107', letterSpacing: -6 }}>SA</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={s.idOrg}>{(data.org || 'Student Alumni').toUpperCase()}</Text>
                    <Text style={s.idLabel}>VERIFIED CREDENTIAL</Text>
                  </View>
                  <View style={[s.idBadge, { backgroundColor: 'rgba(22,163,74,0.25)', borderColor: 'rgba(22,163,74,0.4)' }]}>
                    <Text style={[s.idBadgeText, { color: '#166534' }]}>VERIFIED</Text>
                  </View>
                </View>
                <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={s.idAdminLabel}>EMAIL</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.email || ''}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>ROLE</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.role_label || 'Administrator'}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>COLLEGES</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.colleges_count || 0} verified</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>ACCESS</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.access_label || ''}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>EXPIRES</Text>
                      <Text style={{ color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 12 }}>{fmtDate(data.expiry_date)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <View style={s.qrBox}>
                      {data.qr_code_base64 ? (
                        <Image source={{ uri: `data:image/png;base64,${data.qr_code_base64}` }} style={{ width: 100, height: 100 }} resizeMode="contain" />
                      ) : (
                        <QrCode size={56} color="#1f1107" strokeWidth={1.5} />
                      )}
                    </View>
                    <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(31,17,7,0.2)' }}>
                      <MaterialCommunityIcons name="nfc" size={14} color="rgba(31,17,7,0.5)" />
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={s.idFlipHint}>Tap to flip back →</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Pressable>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Pressable onPress={copyId} style={s.idActionBtn}>
          <Copy size={13} color="#fff" />
          <Text style={s.idActionText}>Copy Admin ID</Text>
        </Pressable>
        <Pressable onPress={shareLink} style={s.idActionBtn}>
          <Share2 size={13} color="#fff" />
          <Text style={s.idActionText}>Share Profile Link</Text>
        </Pressable>
        <Pressable onPress={downloadCard} style={s.idActionBtn}>
          <Download size={13} color="#fff" />
          <Text style={s.idActionText}>Download QR Card</Text>
        </Pressable>
      </View>

      {/* 4 feature cards */}
      <View style={s.featGrid}>
        <FeatureCard icon={ShieldCheck} tint={SAC.green}    title="Verified Identity"   text="Your admin status is verified by the platform." />
        <FeatureCard icon={Building2}   tint="#3B82F6"      title="Platform Authority"  text={`Recognised across all ${data.colleges_count || 48} colleges.`} />
        <FeatureCard icon={QrCode}      tint="#60A5FA"      title="Instant Share"       text="Share QR at events or board meetings." />
        <FeatureCard icon={Lock}        tint={GRAD_TO}      title="Secure Access"       text="Cryptographically signed and tamper-proof." />
      </View>
    </Animated.View>
  );
}
