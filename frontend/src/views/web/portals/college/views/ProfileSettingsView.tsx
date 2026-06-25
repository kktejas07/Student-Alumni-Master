import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Mail, Phone, MapPin, Building2, Globe, Sparkles, Upload, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Field, TF, TA, C, SaveBar } from '@/src/views/web/profile/primitives';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';

export function ProfileSettingsView() {
  const { user, refreshUser } = useAuthStore();
  const [draft, setDraft] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setDraft(JSON.parse(JSON.stringify(user)));
    }
  }, [user]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(user || {});

  const handleSave = async () => {
    try {
      setLoading(true);
      await request('PUT', '/users/me', draft);
      await refreshUser();
      toast.show('Settings saved!', 'success');
    } catch (e: any) {
      toast.show(e.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (field: 'photo_data' | 'banner_data') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'banner_data' ? [3, 1] : [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setDraft({ ...draft, [field]: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  if (!user) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={s.bannerWrapper}>
          <Pressable style={s.bannerBox} onPress={() => pickImage('banner_data')}>
            {draft.banner_data ? (
              <Image source={{ uri: draft.banner_data }} style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={s.bannerPlaceholder}>
                <ImageIcon size={32} color={C.textMuted} />
                <Text style={s.bannerPlaceholderText}>Upload College Banner</Text>
              </View>
            )}
            <View style={s.editOverlay}>
              <Upload size={16} color="#fff" />
              <Text style={s.editOverlayText}>Change Banner</Text>
            </View>
          </Pressable>

          {/* Logo Section */}
          <View style={s.logoWrapper}>
            <Pressable style={s.logoBox} onPress={() => pickImage('photo_data')}>
              {draft.photo_data ? (
                <Image source={{ uri: draft.photo_data }} style={StyleSheet.absoluteFillObject} />
              ) : (
                <Building2 size={32} color={C.textMuted} />
              )}
              <View style={s.editOverlay}>
                <Upload size={14} color="#fff" />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={s.formGrid}>
          <Card icon={Building2} title="Institution Profile" desc="Details about your college or university.">
            <Field label="Institution Name">
              <TF value={draft.institution || draft.college_info?.institution_name || ''} 
                  onChangeText={(t: string) => setDraft({...draft, institution: t})} 
                  placeholder="e.g. St. Xavier's College" />
            </Field>
            <Field label="About Institution (Bio)">
              <TA value={draft.bio || ''} 
                  onChangeText={(t: string) => setDraft({...draft, bio: t})} 
                  placeholder="A brief description of your institution..." />
            </Field>
            <View style={s.row}>
              <Field label="City" style={{ flex: 1 }}>
                <TF value={draft.city || ''} onChangeText={(t: string) => setDraft({...draft, city: t})} placeholder="e.g. Mumbai" />
              </Field>
              <Field label="State" style={{ flex: 1 }}>
                <TF value={draft.state || ''} onChangeText={(t: string) => setDraft({...draft, state: t})} placeholder="e.g. Maharashtra" />
              </Field>
            </View>
          </Card>

          <Card icon={Sparkles} title="Contact & Links" desc="How students and partners can reach the institution.">
            <View style={s.row}>
              <Field label="Official Website" style={{ flex: 1 }}>
                <TF value={draft.portfolio_url || ''} onChangeText={(t: string) => setDraft({...draft, portfolio_url: t})} placeholder="https://" />
              </Field>
              <Field label="LinkedIn Page" style={{ flex: 1 }}>
                <TF value={draft.linkedin_url || ''} onChangeText={(t: string) => setDraft({...draft, linkedin_url: t})} placeholder="linkedin.com/school/..." />
              </Field>
            </View>
            <Field label="Contact Phone">
              <TF value={draft.phone || ''} onChangeText={(t: string) => setDraft({...draft, phone: t})} placeholder="+91..." />
            </Field>
          </Card>

          <Card icon={Sparkles} title="Admin Contact Person" desc="Details of the TPO or primary admin.">
            <Field label="Full Name">
              <TF value={draft.full_name || ''} onChangeText={(t: string) => setDraft({...draft, full_name: t})} placeholder="Your Name" />
            </Field>
            <Field label="Designation / Title">
              <TF value={draft.headline || ''} onChangeText={(t: string) => setDraft({...draft, headline: t})} placeholder="e.g. Head of Placements" />
            </Field>
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasChanges && (
        <SaveBar 
          onDiscard={() => setDraft(JSON.parse(JSON.stringify(user)))}
          onSave={handleSave}
          saving={loading}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, gap: 24, maxWidth: 800, alignSelf: 'center', width: '100%' },
  row: { flexDirection: 'row', gap: 16 },
  formGrid: { gap: 24, marginTop: 40 },
  
  bannerWrapper: {
    height: 160,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    overflow: 'visible',
  },
  bannerBox: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgCard,
    gap: 8,
  },
  bannerPlaceholderText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  
  logoWrapper: {
    position: 'absolute',
    bottom: -40,
    left: 24,
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: C.bg,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  logoBox: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  
  editOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  }
});
