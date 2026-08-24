import React, { useState } from 'react';
import {View, Text, ScrollView, Pressable, TextInput, Platform, Linking} from 'react-native';
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


const styles = {
  scrollContent: { scrollContent: '{', paddingTop: 110, paddingBottom: 0 },
  heroSubtitle: { heroSubtitle: '{', fontSize: 15.5, lineHeight: 25, color: '#9AA0B4', textAlign: 'center', maxWidth: 680 },
  hubDetailsList: { hubDetailsList: '{', gap: 18 },
  clickableTextWrap: { clickableTextWrap: '{', paddingVertical: 2, cursor: 'pointer' },
  clickableTextHovered: { clickableTextHovered: '{', opacity: 0.8 },
  hubIconWrap: { hubIconWrap: '{', width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(129', borderWidth: 1, borderColor: 'rgba(129', alignItems: 'center', justifyContent: 'center' },
  hubRegion: { hubRegion: '{', fontSize: 11, fontWeight: '700', color: '#818CF8', letterSpacing: 1.4, marginBottom: 2 },
  topicPill: { topicPill: '{', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255', borderWidth: 1, borderColor: '#1B1E33', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, cursor: 'pointer' },
  topicPillActive: { topicPillActive: '{', backgroundColor: '#5B4FE9', borderColor: '#8B84FF' },
  topicPillHovered: { topicPillHovered: '{', borderColor: '#2A2A55', backgroundColor: 'rgba(255' },
  topicPillText: { topicPillText: '{', fontSize: 12.5, fontWeight: '600', color: '#9AA0B4' },
  topicPillTextActive: { topicPillTextActive: '{', color: '#FFFFFF' },
  resetButton: { resetButton: '{', backgroundColor: 'rgba(255', borderWidth: 1, borderColor: '#2A2A55', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, cursor: 'pointer' },
  resetButtonHovered: { resetButtonHovered: '{', backgroundColor: 'rgba(255' },
  formFieldsGrid: { formFieldsGrid: '{', gap: 18 },
  textInput: { textInput: '{', backgroundColor: '#05060F', borderWidth: 1, borderColor: '#1B1E33', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 14, outlineStyle: 'none' },
  textArea: { textArea: '{', minHeight: 120, textAlignVertical: 'top' },
  submitButton: { submitButton: '{', backgroundColor: '#5B4FE9', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, cursor: 'pointer' },
  submitButtonHovered: { submitButtonHovered: '{', backgroundColor: '#4B3EE0' },
  submitButtonDisabled: { submitButtonDisabled: '{', opacity: 0.5, cursor: 'not-allowed' },
};

export default function ContactPage() {
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
    <View className="flex-1 relative">
      {Platform.OS === 'web' && (
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
      <View className="w-150 h-75 absolute" />
      <View className="w-100 h-100 absolute" />

      {/* Luxury SA Watermark inside visible page area */}
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />

      <Navbar />

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View className="self-center px-5">
          {/* Hero Section */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)} className="items-center mb-11">
            <View className="flex-row items-center gap-2 px-4 py-2 mb-5">
              <Building2 size={13} color="#8B84FF" />
              <Text className="font-bold">CONTACT & CAMPUS RELATIONS</Text>
            </View>

            <Text className="mb-4 font-extrabold text-text">
              Get in Touch with{' '}
              <Text className="font-extrabold">StudentAlumni Global</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              Connect directly with our leadership, campus partnership coordinators, and human resources team.
              We are dedicated to supporting students, alumni, and educational institutions worldwide.
            </Text>
          </Animated.View>

          {/* Symmetrically Aligned Office Hubs Grid */}
          <Animated.View entering={FadeInDown.duration(700).delay(200)} className="flex-row flex-wrap mb-9">
            {/* India Hub */}
            <View className="flex-1 rounded-2xl p-7 min-w-80">
              <View className="flex-row items-center gap-4 pb-5 mb-6">
                <View className="items-center justify-center rounded-xl w-12 h-12">
                  <MapPin size={22} color="#818CF8" />
                </View>
                <View className="justify-center">
                  <Text className="mb-1 text-xs font-bold">APAC HEADQUARTERS</Text>
                  <Text className="text-lg font-bold text-text">India Hub</Text>
                </View>
              </View>

              <View style={styles.hubDetailsList}>
                {/* Row 1: Address */}
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <MapPin size={17} color="#818CF8" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">OFFICE ADDRESS</Text>
                    <Text className="font-medium">Madhapur, Hyderabad, Telangana, India</Text>
                  </View>
                </View>

                {/* Row 2: Phone */}
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Phone size={17} color="#38BDF8" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">PHONE NUMBER</Text>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={handlePhoneCall}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text className="font-semibold">+91 7569665077</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('+917569665077', 'india_phone')}
                        className="items-center justify-center rounded-md p-1"
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
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Mail size={17} color="#C084FC" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">OFFICIAL EMAIL</Text>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleEmailLaunch('hr@studentalumni.ai')}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text className="font-semibold">hr@studentalumni.ai</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('hr@studentalumni.ai', 'india_email')}
                        className="items-center justify-center rounded-md p-1"
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
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Clock size={17} color="#9AA0B4" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">WORKING HOURS</Text>
                    <Text className="font-medium">Mon – Sat: 9:00 AM – 7:00 PM IST</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* USA Hub */}
            <View className="flex-1 rounded-2xl p-7 min-w-80">
              <View className="flex-row items-center gap-4 pb-5 mb-6">
                <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                  <Globe2 size={22} color="#38BDF8" />
                </View>
                <View className="justify-center">
                  <Text style={[styles.hubRegion, { color: '#38BDF8' }]}>AMERICAS & GLOBAL</Text>
                  <Text className="text-lg font-bold text-text">USA Hub</Text>
                </View>
              </View>

              <View style={styles.hubDetailsList}>
                {/* Row 1: Address */}
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <MapPin size={17} color="#818CF8" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">OFFICE ADDRESS</Text>
                    <Text className="font-medium">Princeton, New Jersey, USA</Text>
                  </View>
                </View>

                {/* Row 2: Phone */}
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Phone size={17} color="#38BDF8" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">PHONE NUMBER</Text>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={handlePhoneCall}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text className="font-semibold">+91 7569665077</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('+917569665077', 'usa_phone')}
                        className="items-center justify-center rounded-md p-1"
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
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Mail size={17} color="#C084FC" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">OFFICIAL EMAIL</Text>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleEmailLaunch('hr@studentalumni.ai')}
                        style={({ hovered }: any) => [
                          styles.clickableTextWrap,
                          hovered && styles.clickableTextHovered,
                        ]}
                      >
                        <Text className="font-semibold">hr@studentalumni.ai</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => copyToClipboard('hr@studentalumni.ai', 'usa_email')}
                        className="items-center justify-center rounded-md p-1"
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
                <View className="flex-row items-start">
                  <View className="items-center justify-center rounded-lg mt-1 w-8 h-8">
                    <Clock size={17} color="#9AA0B4" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="mb-1 font-bold">WORKING HOURS</Text>
                    <Text className="font-medium">Mon – Fri: 9:00 AM – 6:00 PM EST</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Main Interactive Contact Container */}
          <Animated.View entering={FadeInDown.duration(700).delay(300)} className="p-9 mb-9">
            <View className="mb-7">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Headphones size={15} color="#818CF8" />
                <Text className="font-bold">DIRECT INQUIRY & SUPPORT</Text>
              </View>
              <Text className="mb-2 font-bold text-text">Send Us a Message</Text>
              <Text className="mb-5">
                Fill out the details below and our campus relations team will respond promptly.
              </Text>

              {/* Topic Selector Tabs */}
              <Text className="mb-3 text-xs font-bold">SELECT PURPOSE</Text>
              <View className="flex-row flex-wrap gap-2">
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
              <Animated.View entering={FadeInUp.duration(400)} className="items-center px-5 py-10">
                <View className="items-center justify-center mb-5 w-18 h-18">
                  <CheckCircle2 size={36} color="#4ADE80" />
                </View>
                <Text className="mb-3 text-xl font-bold text-text">Inquiry Sent Successfully!</Text>
                <Text className="mb-7 text-base">
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
                  <Text className="text-sm font-semibold text-text">Send Another Message</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.formFieldsGrid}>
                <View className="flex-row flex-wrap gap-4">
                  <View className="flex-1 min-w-65">
                    <Text className="mb-2 font-semibold">Full Name *</Text>
                    <TextInput
                      className="rounded-xl px-4 py-4 text-sm text-text"
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#555A70"
                      value={form.fullName}
                      onChangeText={(t) => setForm({ ...form, fullName: t })}
                    />
                  </View>

                  <View className="flex-1 min-w-65">
                    <Text className="mb-2 font-semibold">Official Email *</Text>
                    <TextInput
                      className="rounded-xl px-4 py-4 text-sm text-text"
                      placeholder="e.g. rahul@example.com"
                      placeholderTextColor="#555A70"
                      keyboardType="email-address"
                      value={form.email}
                      onChangeText={(t) => setForm({ ...form, email: t })}
                    />
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                  <View className="flex-1 min-w-65">
                    <Text className="mb-2 font-semibold">Phone Number</Text>
                    <TextInput
                      className="rounded-xl px-4 py-4 text-sm text-text"
                      placeholder="+91 7569665077"
                      placeholderTextColor="#555A70"
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(t) => setForm({ ...form, phone: t })}
                    />
                  </View>

                  <View className="flex-1 min-w-65">
                    <Text className="mb-2 font-semibold">College / University / Company</Text>
                    <TextInput
                      className="rounded-xl px-4 py-4 text-sm text-text"
                      placeholder="e.g. Princeton / VNR VJIET"
                      placeholderTextColor="#555A70"
                      value={form.organization}
                      onChangeText={(t) => setForm({ ...form, organization: t })}
                    />
                  </View>
                </View>

                <View className="flex-1 min-w-65">
                  <Text className="mb-2 font-semibold">Your Message *</Text>
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
                    <Text className="text-base font-bold text-text">Sending Message...</Text>
                  ) : (
                    <View className="flex-row items-center">
                      <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text className="text-base font-bold text-text">Transmit Message</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Security and Trust Strip */}
          <Animated.View entering={FadeInDown.duration(700).delay(400)} className="flex-row flex-wrap gap-4 rounded-2xl px-6 py-5 mb-15">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={18} color="#4ADE80" />
              <Text className="font-medium">Verified Institutional Support</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Clock size={18} color="#38BDF8" />
              <Text className="font-medium">Direct Response Guarantee</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Globe2 size={18} color="#C084FC" />
              <Text className="font-medium">Accredited Global Campus Network</Text>
            </View>
          </Animated.View>
        </View>

        {/* Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
}


