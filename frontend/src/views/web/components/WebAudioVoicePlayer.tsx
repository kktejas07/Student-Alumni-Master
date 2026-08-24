/**
 * WebAudioVoicePlayer.tsx — Web Audio & Speech Synthesis Player
 * Uses native Web Speech API to vocalize AI interview questions & coaching tips
 * with real-time soundwave equalizer animation.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Volume2, VolumeX, Play, Pause, Sparkles } from 'lucide-react-native';
import { SAC, FONTS } from '../portals/superadmin/tokens';

interface Props {
  textToSpeak: string;
  label?: string;
}

export function WebAudioVoicePlayer({ textToSpeak, label = 'Listen to AI Question' }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
    }
  }, []);

  const handleTogglePlay = () => {
    if (!isSupported) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  if (!isSupported) return null;

  return (
    <Pressable onPress={handleTogglePlay} style={[s.btn, isPlaying && s.btnActive]}>
      {isPlaying ? <Pause size={13} color="#fff" /> : <Volume2 size={13} color="#A78BFA" />}
      <Text style={[s.btnText, isPlaying && { color: '#fff' }]}>
        {isPlaying ? 'Speaking…' : label}
      </Text>

      {/* Soundwave Bars */}
      {isPlaying && (
        <View style={s.soundwaveRow}>
          <View style={[s.bar, { height: 8 }]} />
          <View style={[s.bar, { height: 14 }]} />
          <View style={[s.bar, { height: 10 }]} />
          <View style={[s.bar, { height: 16 }]} />
        </View>
      )}
    </Pressable>
  );
}

const s = {
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderColor: 'rgba(124,58,237,0.3)',
    borderWidth: 1,
  },
  btnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  btnText: {
    color: '#DDD6FE',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  soundwaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  bar: {
    width: 2.5,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
} as const;
