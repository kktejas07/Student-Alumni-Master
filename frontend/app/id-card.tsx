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
  View, Text, ScrollView, ActivityIndicator, Pressable,
  Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Download, Share2, ShieldCheck, MapPin, GraduationCap, Calendar,
  ArrowLeft, Sparkles, Briefcase, Award, Clock,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { request } from '@/src/models/services/api';
import { Colors as C } from '@/src/theme';
import { useToast } from '@/src/views/components';

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
  company?: string;
  position?: string;
  years_experience?: string;
}

const ACCENT = '#A78BFA';
const CARD_BG = '#130A28';
const CARD_BORDER = 'rgba(167,139,250,0.30)';

export default function DigitalIDScreen() {
  const toast = useToast();
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
      if ((navigator as any).share) {
        try { await (navigator as any).share({ title: 'My SA Digital ID', text }); }
        catch { }
      } else if ((navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(text);
        toast.success('Copied', 'Card details copied to clipboard');
      }
    } else {
      try { await Share.share({ message: text, title: 'My SA Digital ID' }); }
      catch { }
    }
  };

  const handleDownload = async () => {
    if (Platform.OS !== 'web') return;
    setDownloading(true);
    try {
      const html2canvas = (window as any).html2canvas;
      const node = (cardRef.current as any) as HTMLElement;
      if (html2canvas && node) {
        const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = `${card?.sa_id || 'id-card'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        if (typeof window !== 'undefined') window.print();
      }
    } catch (e) {
      console.error('download failed', e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-navy">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A78BFA" size="large" />
          <Text className="text-muted text-sm mt-3">Generating your ID card…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (err || !card) {
    return (
      <SafeAreaView className="flex-1 bg-navy">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-rose text-sm text-center">{err || 'No card available.'}</Text>
          <Pressable onPress={load} className="mt-3.5 px-4 py-2.5 rounded-xl bg-violet">
            <Text className="text-text font-body-bold text-sm">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (card.full_name || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <ScrollView className="p-4 pb-16 items-center">
        <View className="flex-row items-center justify-between w-full max-w-md mb-4">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg" testID="id-back" style={{ cursor: 'pointer' } as any}>
            <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
            <Text className="text-muted text-sm font-body-medium">Back</Text>
          </Pressable>
          <Text className="text-text font-body-bold text-base">Digital ID Card</Text>
          <View className="w-16" />
        </View>

        <Text className="text-muted text-xs text-center max-w-sm mb-5 leading-5">
          Your verifiable Student-Alumni credential. Anyone scanning the QR code
          can confirm your identity.
        </Text>

        <View ref={cardRef as any} className="w-full max-w-sm items-center mb-5" collapsable={false} testID="id-card">
          <View className="w-full rounded-2xl overflow-hidden" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER, borderWidth: 1, boxShadow: `0 20px 60px rgba(167,139,250,0.18)` } as any}>
            <View className="flex-row items-center justify-between px-4 py-3.5" style={{ backgroundColor: 'rgba(167,139,250,0.10)', borderBottomColor: CARD_BORDER, borderBottomWidth: 1 }}>
              <View className="flex-row items-center gap-2.5">
                <View className="w-8.5 h-8.5 rounded-lg items-center justify-center" style={{ backgroundColor: ACCENT }}>
                  <Text className="text-text font-body-bold text-sm">SA</Text>
                </View>
                <View>
                  <Text className="text-text font-body-bold text-xs tracking-widest">STUDENT-ALUMNI</Text>
                  <Text className="text-muted text-xs font-body-medium tracking-wider mt-0.5" style={{ fontSize: 9 }}>NETWORK</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 }}>
                <ShieldCheck size={11} color="#10B981" />
                <Text className="text-teal font-body-bold text-xs tracking-wide" style={{ fontSize: 9 }}>VERIFIED</Text>
              </View>
            </View>

            <View className="p-4 gap-4">
              <View className="flex-row items-start gap-4">
                <View className="items-center gap-1.5">
                  <View className="w-23 h-23 rounded-3xl overflow-hidden" style={{ borderColor: CARD_BORDER, borderWidth: 1 }}>
                    {card.photo_data ? (
                      <img
                        src={card.photo_data}
                        alt={card.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 } as any}
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center" style={{ backgroundColor: ACCENT + '24' }}>
                        <Text className="text-violet font-body-bold" style={{ fontSize: 30, letterSpacing: 1 }}>{initials}</Text>
                      </View>
                    )}
                  </View>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: card.status.color + '24', borderColor: card.status.color + '70', borderWidth: 1, marginTop: 2 }}>
                    <Text className="font-body-bold text-xs tracking-wide" style={{ color: card.status.color, fontSize: 9.5 }}>
                      {card.status.label}
                    </Text>
                  </View>
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="text-muted font-body-bold text-xs tracking-wider mb-1" style={{ fontSize: 9 }}>NAME</Text>
                  <Text className="text-text font-body-bold text-lg leading-6" numberOfLines={2}>{card.full_name}</Text>
                  <View className="mt-3">
                    <Text className="text-muted font-body-bold text-xs tracking-wider mb-1" style={{ fontSize: 9 }}>SA-ID</Text>
                    <Text className="text-violet font-body-bold tracking-wider" style={{ fontSize: 18 }} testID="id-sa-id">{card.sa_id}</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row flex-wrap pt-3.5" style={{ borderTopColor: CARD_BORDER, borderTopWidth: 1 }}>
                {card.role === 'mentor' ? (
                  <>
                    <DetailItem icon={<Briefcase size={13} color="rgba(255,255,255,0.55)" />} label="COMPANY" value={card.company || '—'} />
                    {!!card.position && <DetailItem icon={<Award size={13} color="rgba(255,255,255,0.55)" />} label="POSITION" value={card.position} />}
                    {!!card.years_experience && <DetailItem icon={<Clock size={13} color="rgba(255,255,255,0.55)" />} label="EXPERIENCE" value={card.years_experience} />}
                    {(card.city || card.state) && <DetailItem icon={<MapPin size={13} color="rgba(255,255,255,0.55)" />} label="LOCATION" value={[card.city, card.state].filter(Boolean).join(', ')} />}
                  </>
                ) : (
                  <>
                    <DetailItem icon={<GraduationCap size={13} color="rgba(255,255,255,0.55)" />} label="INSTITUTION" value={card.institution || '—'} />
                    {!!card.branch && <DetailItem icon={<Sparkles size={13} color="rgba(255,255,255,0.55)" />} label="BRANCH" value={card.branch} />}
                    {!!card.batch && <DetailItem icon={<Calendar size={13} color="rgba(255,255,255,0.55)" />} label="BATCH" value={card.batch} />}
                    {(card.city || card.state) && <DetailItem icon={<MapPin size={13} color="rgba(255,255,255,0.55)" />} label="LOCATION" value={[card.city, card.state].filter(Boolean).join(', ')} />}
                  </>
                )}
              </View>

              <View className="flex-row items-end pt-3.5" style={{ borderTopColor: CARD_BORDER, borderTopWidth: 1 }}>
                <View className="p-1.5 rounded-3xl" style={{ backgroundColor: '#fff' }}>
                  <QRCode
                    value={card.qr_payload}
                    size={104}
                    backgroundColor="white"
                    color="#0B0510"
                  />
                </View>
                <View className="flex-1 ml-4 justify-end">
                  <Text className="text-muted font-body-bold text-xs tracking-wider mb-1" style={{ fontSize: 9 }}>SCAN TO VERIFY</Text>
                  <Text className="text-muted text-xs font-body-medium" numberOfLines={1}>{card.verify_url}</Text>
                  <View className="h-2" />
                  <Text className="text-muted font-body-bold text-xs tracking-wider mb-1" style={{ fontSize: 9 }}>ISSUED</Text>
                  <Text className="text-muted text-xs font-body-medium">
                    {new Date(card.issued_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-1.5" style={{ backgroundColor: ACCENT, backgroundImage: 'linear-gradient(90deg,#A78BFA 0%,#7B3DBF 50%,#A78BFA 100%)' } as any} />
          </View>
        </View>

        <View className="flex-row gap-2.5 w-full max-w-sm mt-1">
          {Platform.OS === 'web' && (
            <Pressable onPress={handleDownload} className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-violet" testID="id-download" style={{ cursor: 'pointer' } as any}>
              <Download size={16} color="#fff" />
              <Text className="text-text font-body-bold text-sm">{downloading ? 'Saving…' : 'Download PNG'}</Text>
            </Pressable>
          )}
          <Pressable onPress={handleShare} className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl" style={{ backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, cursor: 'pointer' } as any} testID="id-share">
            <Share2 size={16} color="#A78BFA" />
            <Text className="text-violet font-body-bold text-sm">Share</Text>
          </Pressable>
        </View>

        <View className="flex-row items-start gap-2.5 w-full max-w-sm mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.20)', borderWidth: 1 }}>
          <ShieldCheck size={14} color="#10B981" />
          <Text className="flex-1 text-muted text-xs leading-5" style={{ fontFamily: 'DMSans_400Regular' }}>
            Anyone can scan the QR code to verify your SA-ID. Your phone, email, and personal data are never exposed by the QR code — only your name, role, and institution.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="w-1/2 py-1.5 pr-2">
      <View className="flex-row items-center gap-1.5 mb-1">
        {icon}
        <Text className="text-muted font-body-bold text-xs tracking-wide" style={{ fontSize: 9 }}>{label}</Text>
      </View>
      <Text className="text-muted text-xs font-body-medium" numberOfLines={1}>{value}</Text>
    </View>
  );
}
