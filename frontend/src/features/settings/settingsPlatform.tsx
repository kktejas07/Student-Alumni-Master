// TAB 2 — Platform Controls (feature-flag toggles, system settings, danger zone) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Switch, Platform, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Sliders, Trash2, Check, X, Eye, EyeOff, RotateCcw, AlertTriangle, KeyRound, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import { GRAD_TO, GRAD_BG, DEFAULT_SYSTEM_OPTIONS } from './settingsTokens';
import { s } from './settingsStyles';
import { GradientButton, Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 2 — Platform Controls
 * ═══════════════════════════════════════════════════════════════ */
export function PlatformTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [pickerSetting, setPickerSetting] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await request<any>('/admin/platform-controls')); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleFlag = async (key: string, value: boolean) => {
    if (!data) return;
    const newFlags = data.feature_flags.map((f: any) => f.key === key ? { ...f, value } : f);
    setData({ ...data, feature_flags: newFlags });
    try {
      await request('/admin/platform-controls', { method: 'PATCH', body: { key, value, section: 'feature_flags' } });
      onSaved('Saved');
    } catch { load(); }
  };

  const saveSetting = async (key: string, value: string) => {
    setBusy(true);
    try {
      await request('/admin/platform-controls/system-settings', {
        method: 'PATCH', body: { key, value },
      });
      setPickerSetting(null);
      onSaved('Setting updated');
      await load();
    } catch { onSaved('Failed'); }
    finally { setBusy(false); }
  };

  const dangerAction = async (action: string, label: string) => {
    if (!confirm) { setConfirm(action); return; }
    setBusy(true);
    try {
      await request(`/admin/${action}`, { method: 'POST' });
      setConfirm(null);
      onSaved(label);
    } catch (e: any) { onSaved('Failed: ' + String(e?.message || '')); }
    finally { setBusy(false); }
  };

  if (!data) return <Loading />;
  const options = data.system_settings_options || DEFAULT_SYSTEM_OPTIONS;

  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.twoCol}>
      {/* FEATURE FLAGS */}
      <View style={[s.card, { flex: 1, minWidth: 320 }]}>
        <Text style={s.sectionLabel}>FEATURE FLAGS</Text>
        <View style={{ marginTop: 14, gap: 4 }}>
          {data.feature_flags.map((f: any) => (
            <View key={f.key} style={s.toggleRow}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <Text style={s.toggleTitle} numberOfLines={1}>{f.label}</Text>
                <Text style={s.toggleDesc}>{f.description}</Text>
              </View>
              <Switch
                value={!!f.value}
                onValueChange={(v) => toggleFlag(f.key, v)}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: GRAD_TO }}
                thumbColor={f.value ? '#fff' : '#ccc'}
                {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
              />
            </View>
          ))}
        </View>
      </View>

      {/* SYSTEM SETTINGS + DANGER ZONE */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <Text style={s.sectionLabel}>SYSTEM SETTINGS</Text>
          <View style={{ marginTop: 12 }}>
            {data.system_settings.map((it: any, idx: number) => {
              const opts = options[it.key] || DEFAULT_SYSTEM_OPTIONS[it.key] || [];
              const isSecret = /secret|password/i.test(String(it.key));
              const displayValue = it.value || (opts.length === 0 ? 'Add value' : 'Select');
              return (
                <View key={it.key} style={[s.systemRow, idx === data.system_settings.length - 1 ? { borderBottomWidth: 0 } : null]}>
                  <Text style={s.toggleTitle} numberOfLines={1}>{it.label}</Text>
                  <Pressable
                    onPress={() => setPickerSetting({
                      key: it.key,
                      label: it.label,
                      value: it.value || '',
                      type: it.type,
                      help: it.help,
                      options: opts,
                    })}
                    style={({ hovered }: any) => [s.selectBtn, hovered && Platform.OS === 'web' ? { borderColor: 'rgba(251,146,60,0.60)' } : null]}
                  >
                    <Text style={[s.selectValue, !it.value ? { color: SAC.dim } : null]} numberOfLines={1}>
                      {isSecret && it.value ? '••••••••••••' : displayValue}
                    </Text>
                    <View style={{ opacity: 0.6 }}>
                      <ChevronRight size={12} color={SAC.muted} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[s.card, { borderColor: 'rgba(239,68,68,0.30)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color={SAC.red} />
            <Text style={[s.sectionLabel, { color: SAC.red }]}>DANGER ZONE</Text>
          </View>
          <View style={{ gap: 10, marginTop: 14 }}>
            <DangerBtn
              icon={RotateCcw}
              label="Reset all platform settings"
              loading={confirm === 'platform-controls/reset' && busy}
              onConfirm={() => dangerAction('platform-controls/reset', 'Settings reset to defaults')}
            />
            <DangerBtn
              icon={Trash2}
              label="Wipe analytics history"
              loading={confirm === 'analytics/wipe' && busy}
              onConfirm={() => dangerAction('analytics/wipe', 'Analytics cleared')}
            />
            <DangerBtn
              icon={KeyRound}
              label="Rotate JWT signing key"
              loading={confirm === 'security/rotate-jwt' && busy}
              onConfirm={() => dangerAction('security/rotate-jwt', 'JWT key rotated')}
            />
          </View>
        </View>
      </View>

      {pickerSetting && (
        <SettingPickerModal
          setting={pickerSetting}
          onSelect={(value) => saveSetting(pickerSetting.key, value)}
          onClose={() => setPickerSetting(null)}
        />
      )}
    </Animated.View>
  );
}

export function SettingPickerModal({ setting, onSelect, onClose }: {
  setting: {
    key: string;
    label: string;
    value: string;
    type?: string;
    help?: string;
    options: { value: string; label: string }[];
  };
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const isTextInput = (setting.options || []).length === 0;
  const isPassword = /secret|password/i.test(setting.key || '');
  const [textValue, setTextValue] = useState(setting.value || '');
  const [showPwd, setShowPwd] = useState(false);
  const inputPlaceholder = isPassword ? 'Paste secret value' : 'Paste client ID';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.pickerBackdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation?.()}>
          <Animated.View entering={FadeInDown.duration(220)} style={s.pickerCard}>
            <LinearGradient colors={GRAD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerHero}>
              <View style={s.pickerIcon}>
                {isTextInput ? <KeyRound size={16} color={GRAD_TO} /> : <Sliders size={16} color={GRAD_TO} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pickerTitle}>{setting.label}</Text>
                <Text style={s.pickerSub}>
                  {isTextInput ? 'Enter and save this platform credential' : 'Select an option to update this setting'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>
            {isTextInput ? (
              <>
                <View style={s.credentialBody}>
                  {!!setting.help && <Text style={s.credentialHelp}>{setting.help}</Text>}
                  <View>
                    <Text style={s.credentialLabel}>{setting.label}</Text>
                    <View style={s.credentialInputWrap}>
                      <TextInput
                        style={s.credentialInput}
                        value={textValue}
                        onChangeText={setTextValue}
                        placeholder={inputPlaceholder}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        secureTextEntry={isPassword && !showPwd}
                        autoFocus
                        multiline={false}
                      />
                      {isPassword && (
                        <Pressable onPress={() => setShowPwd(!showPwd)} style={s.iconOnlyBtn}>
                          {showPwd ? <EyeOff size={18} color="rgba(255,255,255,0.6)" /> : <Eye size={18} color="rgba(255,255,255,0.6)" />}
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.modalFooter}>
                  <Pressable onPress={onClose} style={s.secondaryBtn}>
                    <Text style={s.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                  <GradientButton onPress={() => onSelect(textValue)}>
                    <Check size={14} color="#fff" />
                    <Text style={s.primaryBtnText}>Save credential</Text>
                  </GradientButton>
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 12, gap: 6 }}>
                {setting.options.map((opt) => {
                  const isSelected = opt.value === setting.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => { onSelect(opt.value); onClose(); }}
                      style={[s.pickerOption, isSelected && s.pickerOptionActive]}
                    >
                      <View style={[s.pickerOptionRadio, isSelected && { borderColor: GRAD_TO, backgroundColor: GRAD_TO + '22' }]}>
                        {isSelected && <View style={s.pickerRadioDot} />}
                      </View>
                      <Text style={[s.pickerOptionText, isSelected && { color: GRAD_TO, fontFamily: FONTS.xbold }]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Check size={13} color={GRAD_TO} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DangerBtn({ icon: Icon, label, loading, onConfirm }: { icon: any; label: string; loading?: boolean; onConfirm: () => void }) {
  return (
    <Pressable
      onPress={onConfirm}
      disabled={loading}
      style={({ hovered }: any) => [
        s.dangerBtn,
        hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(239,68,68,0.10)' } : null,
        loading ? { opacity: 0.6 } : null,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={SAC.red} />
      ) : (
        <Icon size={13} color={SAC.red} />
      )}
      <Text style={s.dangerBtnText}>{label}</Text>
      <View style={{ flex: 1 }} />
      <ChevronRight size={13} color={SAC.red} />
    </Pressable>
  );
}
