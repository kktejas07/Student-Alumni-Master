/**
 * Agent K — Cmd/Ctrl+K Quick Launcher modal.
 *
 * Floating centered modal with a single prompt input + suggestion chips.
 * Submitting routes the user to /agent-k with the prompt prefilled (the
 * AgentKWorkspace owns the actual run lifecycle).
 *
 * Mounts globally inside (tabs)/_layout.tsx so any screen can trigger it.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { NX } from '@/src/theme/nexus';
import { useAgentKStore } from '@/src/viewmodels/stores/agentKStore';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

const SUGGESTIONS = [
  'Find top 5 SWE career opportunities matching my profile',
  'Show me my rewards balance and tier',
  'Find React mentors with their rates',
  'Find free system design courses',
  'Audit my profile against my career goal',
];

export function AgentKQuickLauncher() {
  const open = useAgentKStore((s) => s.quickLauncherOpen);
  const close = useAgentKStore((s) => s.closeQuickLauncher);
  const router = useRouter();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (open) t = setTimeout(() => inputRef.current?.focus(), 60);
    else setText('');
    return () => clearTimeout(t);
  }, [open]);

  const submit = (prompt?: string) => {
    const final = (prompt ?? text).trim();
    if (!final) return;
    close();
    // Pass the prompt via query-string; workspace reads it on mount.
    router.push({ pathname: '/agent-k', params: { prompt: final, autorun: '1' } });
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}
      hardwareAccelerated
    >
      <TouchableWithoutFeedback onPress={close}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View entering={FadeInDown.duration(220)} style={s.card}>
              {/* Header with sparkles + cmd+k hint */}
              <View style={s.inputRow}>
                <LinearGradient
                  colors={[NX.purple, NX.cyan] as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.iconTile}
                >
                  <MaterialCommunityIcons name="auto-fix" size={16} color="#fff" />
                </LinearGradient>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder="Tell Agent K what to do…"
                  placeholderTextColor={NX.textT}
                  style={s.input}
                  onSubmitEditing={() => submit()}
                  returnKeyType="go"
                  accessibilityLabel="Agent K prompt"
                />
                <View style={s.kbdGroup}>
                  <View style={s.kbd}><Text style={s.kbdText}>⌘</Text></View>
                  <View style={s.kbd}><Text style={s.kbdText}>K</Text></View>
                </View>
              </View>

              <View style={s.divider} />

              {/* Suggestion chips */}
              <Text style={s.sectionLabel}>SUGGESTIONS</Text>
              <View style={s.chipGrid}>
                {SUGGESTIONS.map((sugg, i) => (
                  <Animated.View key={sugg} entering={FadeIn.delay(i * 40).duration(180)}>
                    <Pressable
                      onPress={() => submit(sugg)}
                      style={({ hovered }: any) => ([
                        s.chip,
                        hovered && Platform.OS === 'web' ? { borderColor: NX.purple, backgroundColor: 'rgba(124,58,237,0.08)' } as any : null,
                      ])}
                    >
                      <MaterialCommunityIcons name="auto-fix" size={12} color={NX.purple} />
                      <Text style={s.chipText} numberOfLines={1}>{sugg}</Text>
                      <MaterialCommunityIcons name="arrow-right" size={12} color={NX.textS} />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>

              {/* Footer */}
              <View style={s.footer}>
                <Text style={s.footerText}>Press <Text style={{ color: NX.textP }}>Enter</Text> to run · <Text style={{ color: NX.textP }}>Esc</Text> to close</Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  card: {
    width: '100%', maxWidth: 640,
    backgroundColor: NX.surface1,
    borderRadius: 18, borderWidth: 1, borderColor: NX.borderHi,
    padding: 16,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
    } as any) : {}),
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 4, paddingVertical: 4,
  },
  iconTile: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, color: NX.textP, fontFamily: FONT, fontSize: 15, fontWeight: '500',
    paddingVertical: 12, paddingHorizontal: 4,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  kbdGroup: { flexDirection: 'row', gap: 4 },
  kbd: {
    minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 5,
    backgroundColor: NX.surface3, borderWidth: 1, borderColor: NX.border,
    alignItems: 'center', justifyContent: 'center',
  },
  kbdText: { color: NX.textS, fontFamily: FONT, fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: NX.border, marginVertical: 12 },

  sectionLabel: { color: NX.textT, fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  chipGrid: { flexDirection: 'column', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: NX.surface2, borderRadius: 10, borderWidth: 1, borderColor: NX.border,
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer', transitionProperty: 'border-color, background-color', transitionDuration: '150ms',
    } as any) : {}),
  },
  chipText: { color: NX.textP, fontFamily: FONT, fontSize: 13, flex: 1 },

  footer: { marginTop: 12, alignItems: 'center' },
  footerText: { color: NX.textT, fontFamily: FONT, fontSize: 11 },
});
