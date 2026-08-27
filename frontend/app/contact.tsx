import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  Globe2,
  Clock,
  MessageSquare,
  Building2,
  ShieldCheck,
  Headphones,
  Copy,
  Check,
} from 'lucide-react-native';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { useRouter } from 'expo-router';
import LandingPage from '@/src/views/web/LandingPage';

export default function ContactPage() {
  if (Platform.OS === 'web') {
    return <LandingPage initialTab="contact" />;
  }

  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<'general' | 'hr' | 'colleges' | 'mentors'>('general');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const topics = [
    { id: 'general', label: 'General Inquiry', icon: MessageSquare },
    { id: 'hr', label: 'HR & Careers', icon: Mail },
    { id: 'colleges', label: 'College Partnerships', icon: Building2 },
    { id: 'mentors', label: 'Mentor Network', icon: Globe2 },
  ] as const;

  const copyToClipboard = (text: string, field: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+917569665077').catch(() => {});
  };

  const handleEmailLaunch = (recipientEmail: string = 'hr@studentalumni.ai') => {
    Linking.openURL(`mailto:${recipientEmail}`).catch(() => {});
  };

  const handleSubmit = () => {
    if (!form.fullName || !form.email || !form.message) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <View style={styles.outerWrap}>
      {(Platform.OS as string) === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: #05060F !important;
                color: #F4F5FB !important;
                font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              }
              .sa-jewel-text {
                background: linear-gradient(135deg, #F5D0FE 0%, #C084FC 25%, #818CF8 50%, #38BDF8 75%, #E879F9 100%) !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                display: inline-block !important;
              }
            `,
          }}
        />
      )}

      {/* Ambient background glows matching verify portal */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* Luxury SA Watermark inside visible page area */}
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />

      <Navbar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Hero Section */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.heroSection}>
            <View style={styles.pillBadge}>
              <Building2 size={13} color="#8B84FF" />
              <Text style={styles.pillBadgeText}>CONTACT & CAMPUS RELATIONS</Text>
            </View>

            <Text style={styles.heroTitle}>
              Get in Touch with{' '}
              <Text style={styles.jewelTitle}>StudentAlumni Global</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              Connect directly with our leadership, campus partnership coordinators, and human resources team.
              We are dedicated to supporting students, alumni, and educational institutions worldwide.
            </Text>
          </Animated.View>

          {/* Symmetrically Aligned Office Hubs Grid */}
          <Animated.View entering={FadeInDown.duration(700).delay(200)} style={styles.hubsGrid}>
            {/* India Hub */}
            <View style={styles.hubCard}>
              <View style={styles.hubHeader}>
                <View style={styles.hubIconWrap}>
                  <MapPin size={22} color="#818CF8" />
                </View>
                <View style={styles.hubHeaderTitleWrap}>
                  <Text style={styles.hubRegion}>APAC HEADQUARTERS</Text>
                  <Text style={styles.hubCity}>India Hub</Text>
                </View>
              </View>

              <View style={styles.hubDetailsList}>
                {/* Row 1: Address */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <MapPin size={17} color="#818CF8" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>OFFICE ADDRESS</Text>
                    <Text style={styles.rowValue}>Madhapur, Hyderabad, Telangana, India</Text>
                  </View>
                </View>

                {/* Row 2: Phone */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Phone size={17} color="#38BDF8" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>PHONE NUMBER</Text>
                    <View style={styles.interactiveValueRow}>
                      <Pressable
                        onPress={handlePhoneCall}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text style={styles.rowHighlightValue}>+91 7569665077</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('+917569665077', 'india_phone')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'india_phone' ? (
                          <Check size={14} color="#4ADE80" />
                        ) : (
                          <Copy size={14} color="#9AA0B4" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Row 3: Email */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Mail size={17} color="#C084FC" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>OFFICIAL EMAIL</Text>
                    <View style={styles.interactiveValueRow}>
                      <Pressable
                        onPress={() => handleEmailLaunch('hr@studentalumni.ai')}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text style={styles.rowHighlightValue}>hr@studentalumni.ai</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('hr@studentalumni.ai', 'india_email')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'india_email' ? (
                          <Check size={14} color="#4ADE80" />
                        ) : (
                          <Copy size={14} color="#9AA0B4" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Row 4: Working Hours */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Clock size={17} color="#9AA0B4" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>WORKING HOURS</Text>
                    <Text style={styles.rowSubValue}>Mon – Sat: 9:00 AM – 7:00 PM IST</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* USA Hub */}
            <View style={styles.hubCard}>
              <View style={styles.hubHeader}>
                <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                  <Globe2 size={22} color="#38BDF8" />
                </View>
                <View style={styles.hubHeaderTitleWrap}>
                  <Text style={[styles.hubRegion, { color: '#38BDF8' }]}>AMERICAS & GLOBAL</Text>
                  <Text style={styles.hubCity}>USA Hub</Text>
                </View>
              </View>

              <View style={styles.hubDetailsList}>
                {/* Row 1: Address */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <MapPin size={17} color="#818CF8" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>OFFICE ADDRESS</Text>
                    <Text style={styles.rowValue}>Princeton, New Jersey, USA</Text>
                  </View>
                </View>

                {/* Row 2: Phone */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Phone size={17} color="#38BDF8" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>PHONE NUMBER</Text>
                    <View style={styles.interactiveValueRow}>
                      <Pressable
                        onPress={handlePhoneCall}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text style={styles.rowHighlightValue}>+91 7569665077</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('+917569665077', 'usa_phone')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'usa_phone' ? (
                          <Check size={14} color="#4ADE80" />
                        ) : (
                          <Copy size={14} color="#9AA0B4" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Row 3: Email */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Mail size={17} color="#C084FC" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>OFFICIAL EMAIL</Text>
                    <View style={styles.interactiveValueRow}>
                      <Pressable
                        onPress={() => handleEmailLaunch('hr@studentalumni.ai')}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text style={styles.rowHighlightValue}>hr@studentalumni.ai</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('hr@studentalumni.ai', 'usa_email')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'usa_email' ? (
                          <Check size={14} color="#4ADE80" />
                        ) : (
                          <Copy size={14} color="#9AA0B4" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Row 4: Working Hours */}
                <View style={styles.hubRow}>
                  <View style={styles.iconContainer}>
                    <Clock size={17} color="#9AA0B4" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>WORKING HOURS</Text>
                    <Text style={styles.rowSubValue}>Mon – Fri: 9:00 AM – 6:00 PM EST</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Main Interactive Contact Container */}
          <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.formContainer}>
            <View style={styles.formLeftHeader}>
              <View style={styles.headerTag}>
                <Headphones size={15} color="#818CF8" />
                <Text style={styles.headerTagText}>DIRECT INQUIRY & SUPPORT</Text>
              </View>
              <Text style={styles.formCardHeading}>Send Us a Message</Text>
              <Text style={styles.formCardSub}>
                Fill out the details below and our campus relations team will respond promptly.
              </Text>

              {/* Topic Selector Tabs */}
              <Text style={styles.selectorLabel}>SELECT PURPOSE</Text>
              <View style={styles.topicSelectorRow}>
                {topics.map((t) => {
                  const isSelected = selectedTopic === t.id;
                  const IconComponent = t.icon;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedTopic(t.id)}
                      style={({ hovered }: any) => [
                        styles.topicPill,
                        isSelected && styles.topicPillActive,
                        hovered && !isSelected && styles.topicPillHovered,
                      ]}
                    >
                      <IconComponent
                        size={14}
                        color={isSelected ? '#FFFFFF' : '#9AA0B4'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.topicPillText,
                          isSelected && styles.topicPillTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {submitted ? (
              <Animated.View entering={FadeInUp.duration(400)} style={styles.successState}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={36} color="#4ADE80" />
                </View>
                <Text style={styles.successTitle}>Inquiry Sent Successfully!</Text>
                <Text style={styles.successDesc}>
                  Thank you for reaching out, <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{form.fullName || 'there'}</Text>.
                  We have routed your message to our {selectedTopic.toUpperCase()} team at <Text style={{ color: '#C084FC' }}>hr@studentalumni.ai</Text>. You will receive a response shortly.
                </Text>
                <Pressable
                  onPress={() => {
                    setSubmitted(false);
                    setForm({ fullName: '', email: '', phone: '', organization: '', message: '' });
                  }}
                  style={({ hovered }: any) => [
                    styles.resetButton,
                    hovered && styles.resetButtonHovered,
                  ]}
                >
                  <Text style={styles.resetButtonText}>Send Another Message</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.formFieldsGrid}>
                <View style={styles.rowTwoCols}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#555A70"
                      value={form.fullName}
                      onChangeText={(t) => setForm({ ...form, fullName: t })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Official Email *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. rahul@example.com"
                      placeholderTextColor="#555A70"
                      keyboardType="email-address"
                      value={form.email}
                      onChangeText={(t) => setForm({ ...form, email: t })}
                    />
                  </View>
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+91 7569665077"
                      placeholderTextColor="#555A70"
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(t) => setForm({ ...form, phone: t })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>College / University / Company</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Princeton / VNR VJIET"
                      placeholderTextColor="#555A70"
                      value={form.organization}
                      onChangeText={(t) => setForm({ ...form, organization: t })}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Message *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="How can we assist you with our platform, mentorship, or institutional onboarding?"
                    placeholderTextColor="#555A70"
                    multiline
                    numberOfLines={5}
                    value={form.message}
                    onChangeText={(t) => setForm({ ...form, message: t })}
                  />
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={sending || !form.fullName || !form.email || !form.message}
                  style={({ hovered }: any) => [
                    styles.submitButton,
                    hovered && styles.submitButtonHovered,
                    (!form.fullName || !form.email || !form.message) && styles.submitButtonDisabled,
                  ]}
                >
                  {sending ? (
                    <Text style={styles.submitButtonText}>Sending Message...</Text>
                  ) : (
                    <View style={styles.submitButtonInner}>
                      <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>Transmit Message</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Security and Trust Strip */}
          <Animated.View entering={FadeInDown.duration(700).delay(400)} style={styles.trustBanner}>
            <View style={styles.trustItem}>
              <ShieldCheck size={18} color="#4ADE80" />
              <Text style={styles.trustText}>Verified Institutional Support</Text>
            </View>
            <View style={styles.trustItem}>
              <Clock size={18} color="#38BDF8" />
              <Text style={styles.trustText}>Direct Response Guarantee</Text>
            </View>
            <View style={styles.trustItem}>
              <Globe2 size={18} color="#C084FC" />
              <Text style={styles.trustText}>Accredited Global Campus Network</Text>
            </View>
          </Animated.View>
        </View>

        {/* Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#05060F',
    position: 'relative',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -300 }],
    width: 600,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }
      : {}),
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 200,
    right: 0,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(139, 132, 255, 0.06)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }
      : {}),
  },
  backgroundWatermarkRight: {
    position: 'absolute',
    top: 100,
    right: -240,
    opacity: 0.05,
    zIndex: 0,
    transform: [{ rotate: '12deg' }],
    ...(Platform.OS === 'web'
      ? ({
          pointerEvents: 'none',
          userSelect: 'none',
        } as any)
      : {}),
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: 110,
    paddingBottom: 0,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  /* Top Navigation */
  topBackRow: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#1B1E33',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backButtonHovered: {
    borderColor: '#5B4FE9',
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
  },
  backButtonText: {
    color: '#9AA0B4',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Hero Section */
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 44,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 18,
  },
  pillBadgeText: {
    color: '#8B84FF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 52,
  },
  jewelTitle: {
    color: '#C084FC',
    fontWeight: '800',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(135deg, #F5D0FE 0%, #C084FC 25%, #818CF8 50%, #38BDF8 75%, #E879F9 100%)',
          WebkitBackgroundImage: 'linear-gradient(135deg, #F5D0FE 0%, #C084FC 25%, #818CF8 50%, #38BDF8 75%, #E879F9 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        } as any)
      : {}),
  },
  heroSubtitle: {
    fontSize: 15.5,
    lineHeight: 25,
    color: '#9AA0B4',
    textAlign: 'center',
    maxWidth: 680,
  },

  /* Symmetrical Office Hubs Grid */
  hubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 36,
  },
  hubCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#0C0E1B',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 20,
    padding: 28,
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#171A2C',
  },
  hubIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubHeaderTitleWrap: {
    justifyContent: 'center',
  },
  hubRegion: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  hubCity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Standardized Hub Rows */
  hubDetailsList: {
    gap: 18,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 46,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#707790',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  rowValue: {
    color: '#D5D8E4',
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 20,
  },
  interactiveValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickableTextWrap: {
    paddingVertical: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  clickableTextHovered: {
    opacity: 0.8,
  },
  rowHighlightValue: {
    color: '#F4F5FB',
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowSubValue: {
    color: '#9AA0B4',
    fontSize: 13.5,
    fontWeight: '500',
  },
  copyBtn: {
    marginLeft: 10,
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#1B1E33',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* Form Container */
  formContainer: {
    backgroundColor: '#0C0E1B',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 24,
    padding: 36,
    marginBottom: 36,
  },
  formLeftHeader: {
    marginBottom: 26,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerTagText: {
    color: '#818CF8',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  formCardHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  formCardSub: {
    fontSize: 14.5,
    color: '#9AA0B4',
    lineHeight: 22,
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#707790',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  topicSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: '#1B1E33',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  topicPillActive: {
    backgroundColor: '#5B4FE9',
    borderColor: '#8B84FF',
  },
  topicPillHovered: {
    borderColor: '#2A2A55',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  topicPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9AA0B4',
  },
  topicPillTextActive: {
    color: '#FFFFFF',
  },

  /* Fields */
  formFieldsGrid: {
    gap: 18,
  },
  rowTwoCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
    minWidth: 260,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D5D8E4',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#05060F',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#5B4FE9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  submitButtonHovered: {
    backgroundColor: '#4B3EE0',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}),
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Success State */
  successState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    color: '#9AA0B4',
    textAlign: 'center',
    maxWidth: 540,
    lineHeight: 24,
    marginBottom: 26,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#2A2A55',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  resetButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Trust Banner */
  trustBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 60,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    color: '#9AA0B4',
    fontSize: 13.5,
    fontWeight: '500',
  },
});
