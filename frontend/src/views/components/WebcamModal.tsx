import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, Platform, ActivityIndicator, Image
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [restartCount, setRestartCount] = useState(0);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      setCapturedImage(null);
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    let activeStream: any = null;
    setLoading(true);
    setError(null);

    async function startCamera() {
      try {
        const getUserMedia =
          navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
          (navigator as any).webkitGetUserMedia?.bind(navigator) ||
          (navigator as any).mozGetUserMedia?.bind(navigator) ||
          (navigator as any).msGetUserMedia?.bind(navigator);

        if (!getUserMedia) {
          setError('Camera is not supported or blocked on this browser context (requires HTTPS or localhost).');
          setLoading(false);
          return;
        }

        const mediaStream = await getUserMedia({
          video: {
            facingMode: 'user'
          },
          audio: false
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        setLoading(false);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Failed to get camera stream:', err);
        setError('Camera permission denied or webcam not found.');
        setLoading(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, [visible, restartCount]);

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

      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);

        const sx = ((video.videoWidth || size) - size) / 2;
        const sy = ((video.videoHeight || size) - size) / 2;

        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);

        stream.getTracks().forEach((track: any) => track.stop());
        setStream(null);

        setCapturedImage(base64);
      }
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture photo.');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setRestartCount((c) => c + 1);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track: any) => track.stop());
    }
    setStream(null);
    setCapturedImage(null);
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
      <View className="flex-1 bg-black/80 items-center justify-center px-6">
        <View
          className="w-full max-w-[380px] rounded-3xl border border-[rgba(176,127,223,0.30)] bg-[#13091F] p-5 items-center"
          style={{
            backgroundImage: 'linear-gradient(180deg, #1A0E2E 0%, #0A0512 100%)',
            boxShadow: '0px 16px 60px rgba(91,33,182,0.45)',
          }}
        >
          <View className="w-full flex-row items-center justify-between mb-4">
            <Text className="text-white font-body-bold text-base">{capturedImage ? 'Confirm Selfie' : 'Take a Selfie'}</Text>
            <Pressable onPress={handleClose} className="p-1 rounded-full bg-white/[0.06]">
              <X size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <View className="w-[260px] h-[260px] rounded-[130px] border-[3px] border-[rgba(129,140,248,0.5)] overflow-hidden bg-black relative items-center justify-center mb-5" style={{ boxShadow: '0px 0px 24px rgba(129,140,248,0.25)' }}>
            {capturedImage ? (
              <Image
                source={{ uri: capturedImage }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <>
                {loading && (
                  <View className="absolute top-0 bottom-0 left-0 right-0 items-center justify-center p-5">
                    <ActivityIndicator size="large" color="#A78BFA" />
                    <Text className="text-white/60 font-body-semibold text-[13px] mt-2.5">Accessing Camera…</Text>
                  </View>
                )}

                {error && (
                  <View className="absolute top-0 bottom-0 left-0 right-0 items-center justify-center p-5">
                    <Text className="text-red-500 font-body-semibold text-[13px] text-center leading-[18px]">{error}</Text>
                  </View>
                )}

                {visible && !error && (
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                      display: loading ? 'none' : 'block'
                    }}
                    autoPlay
                    playsInline
                    muted
                  />
                )}
              </>
            )}
          </View>

          <View className="w-full items-center">
            {capturedImage ? (
              <View className="flex-row gap-3 w-full">
                <Pressable
                  onPress={handleRetake}
                  className="flex-1 h-11 rounded-[14px] bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.4)] items-center justify-center"
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                >
                  <Text className="text-red-500 font-body-bold text-sm">Retake</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  className="flex-1 h-11 rounded-[14px] bg-[#818CF8] items-center justify-center"
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                >
                  <Text className="text-[#1E1B4B] font-body-bold text-sm">Confirm</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={capturePhoto}
                disabled={loading || !!error}
                className="flex-row items-center justify-center gap-2 bg-[#818CF8] rounded-[14px] py-3 px-7 w-full"
                style={{ ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}), ...(loading || !!error ? { backgroundColor: 'rgba(255,255,255,0.15)', cursor: 'default' } : {}) }}
              >
                <Camera size={18} color="#000" />
                <Text className="text-[#1E1B4B] font-body-bold text-sm">Capture Photo</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
