import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Platform, ActivityIndicator
} from 'react-native';
import { Camera, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

export function WebcamModal({ visible, onClose, onCapture }: Props) {
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    let activeStream: any = null;
    setLoading(true);
    setError(null);

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 480 },
            height: { ideal: 480 },
            aspectRatio: 1
          },
          audio: false
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        setLoading(false);

        // Bind stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Failed to get camera stream:', err);
        setError('Camera permission denied or camera not found.');
        setLoading(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, [visible]);

  // Bind srcObject if stream changes or ref becomes available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Capture matching dimensions
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror horizontally for selfie feel
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        
        // Crop center square
        const sx = ((video.videoWidth || size) - size) / 2;
        const sy = ((video.videoHeight || size) - size) / 2;
        
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        
        // Stop stream tracks
        stream.getTracks().forEach((track: any) => track.stop());
        setStream(null);
        
        onCapture(base64);
      }
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture photo.');
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track: any) => track.stop());
    }
    setStream(null);
    onClose();
  };

  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Take a Selfie</Text>
            <Pressable onPress={handleClose} style={s.closeBtn}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* Camera Frame */}
          <View style={s.cameraFrame}>
            {loading && (
              <View style={s.overlay}>
                <ActivityIndicator size="large" color="#A78BFA" />
                <Text style={s.loadingText}>Accessing Camera…</Text>
              </View>
            )}
            
            {error && (
              <View style={s.overlay}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Native Video Element */}
            {visible && !error && (
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Horizontal mirror
                  display: loading ? 'none' : 'block'
                }}
                autoPlay
                playsInline
                muted
              />
            )}
          </View>

          {/* Action Footer */}
          <View style={s.footer}>
            <Pressable
              onPress={capturePhoto}
              disabled={loading || !!error}
              style={({ pressed }) => [
                s.captureBtn,
                (loading || !!error) && s.disabledBtn,
                pressed && { opacity: 0.8 }
              ]}
            >
              <Camera size={18} color="#000" />
              <Text style={s.captureBtnText}>Capture Photo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.30)',
    backgroundColor: '#13091F',
    padding: 20,
    alignItems: 'center',
    ...({
      backgroundImage: 'linear-gradient(180deg, #1A0E2E 0%, #0A0512 100%)' as any,
      boxShadow: '0px 16px 60px rgba(91,33,182,0.45)' as any,
    } as any),
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cameraFrame: {
    width: 260,
    height: 260,
    borderRadius: 130, // Perfect circular crop for selfie
    borderWidth: 3,
    borderColor: 'rgba(167,139,250,0.5)',
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...({
      boxShadow: '0px 0px 24px rgba(167,139,250,0.25)' as any
    } as any),
  },
  overlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C4B5FD',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    ...({ cursor: 'pointer' } as any),
  },
  disabledBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    ...({ cursor: 'default' } as any),
  },
  captureBtnText: {
    color: '#000',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
});
