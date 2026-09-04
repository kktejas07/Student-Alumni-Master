import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { FontAwesome5 } from '@expo/vector-icons';

type Html5Qrcode = any;

const getQrBox = (): { width: number; height: number } => {
  if (typeof window === 'undefined') return { width: 250, height: 250 };
  const vw = window.innerWidth;
  const size = Math.min(Math.floor(vw * 0.78), 320);
  return { width: size, height: size };
};

export function VendorScannerView() {
  const { token } = useVendorAuthStore();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      try { scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
    streamRef.current = null;
    setScanning(false);
    setTorchOn(false);
  }, []);

  const getStream = useCallback((): MediaStream | null => {
    if (streamRef.current) return streamRef.current;
    const video = document.querySelector('#reader video') as HTMLVideoElement | null;
    const stream = (video as any)?.srcObject as MediaStream | null;
    if (stream) streamRef.current = stream;
    return stream;
  }, []);

  const toggleTorch = useCallback(async () => {
    const stream = getStream();
    const track = stream?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      const caps: any = track.getCapabilities?.() || {};
      if (!caps.torch) return;
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (_) {}
  }, [torchOn, getStream]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) await stopScanner();
    setScanError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      const qrbox = getQrBox();
      const config: any = {
        fps: 20,
        qrbox,
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          advanced: [{ focusMode: 'continuous' }, { exposureMode: 'continuous' }],
        },
      };

      const onDetect = (decodedText: string) => {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            setScanning(false);
            setScannedId(decodedText.trim());
          }).catch(() => {
            setScanning(false);
            setScannedId(decodedText.trim());
          });
        } else {
          setScanning(false);
          setScannedId(decodedText.trim());
        }
      };

      const cameras = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[]);
      const backCamera = [...cameras].reverse().find(
        (c) => /back|rear|environment/i.test(c.label)
      ) || cameras[cameras.length - 1];

      const startOpts = backCamera
        ? backCamera.id
        : { facingMode: 'environment' } as any;

      await scanner.start(startOpts, config, onDetect, () => {});

      // small delay then try to enable torch if supported
      setTimeout(() => {
        const stream = getStream();
        const track = stream?.getVideoTracks()?.[0];
        try {
          const caps: any = track?.getCapabilities?.() || {};
          if (caps.torch) {
            track?.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
          }
        } catch (_) {}
      }, 500);

      setScanning(true);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setScanError('Camera access denied. Enable it in your browser settings and reload.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setScanError('No camera found on this device.');
      } else {
        setScanError('Could not start camera. Tap "Start Camera Scan" to retry.');
      }
      try { scannerRef.current?.clear(); } catch (_) {}
      scannerRef.current = null;
      setScanning(false);
      console.error('Scanner init failed', e);
    }
  }, [stopScanner, getStream]);

  const stopCamera = useCallback(async () => {
    await stopScanner();
  }, [stopScanner]);

  const handleFileUpload = useCallback(async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setScanError(null);
    setMessage(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      const decoded = await scanner.scanFile(file, true);
      await stopScanner();
      setScannedId(String(decoded).trim());
    } catch (_err: any) {
      await stopScanner();
      setScanError('No QR code found in the selected image. Try another photo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  }, [stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFulfill = async () => {
    if (!scannedId) return;
    setFulfilling(true);
    setMessage(null);
    try {
      const res = await request<any>('/vendors/fulfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { order_id: scannedId },
      });
      if (res.success) {
        setMessage({ text: 'Order fulfilled successfully!', type: 'success' });
        setScannedId(null);
      } else if (res.status === 'already_fulfilled') {
        setMessage({ text: res.message || 'This order has already been collected.', type: 'warning' });
      } else {
        setMessage({ text: res.error || 'Failed to fulfill order', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to fulfill order', type: 'error' });
    } finally {
      setFulfilling(false);
    }
  };

  const handleReset = () => {
    setScannedId(null);
    setMessage(null);
    setScanError(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Order Scanner</Text>
          <Text style={styles.subtitle}>Point the camera at an order QR code</Text>
        </View>
      </View>

      {message && (
        <View style={[styles.messageBox, message.type === 'success' ? styles.messageSuccess : message.type === 'warning' ? styles.messageWarning : styles.messageError]}>
          <FontAwesome5 name={message.type === 'success' ? 'check-circle' : message.type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'} size={20} color={message.type === 'success' ? '#10B981' : message.type === 'warning' ? '#F59E0B' : '#EF4444'} />
          <Text style={[styles.messageText, { color: message.type === 'success' ? '#10B981' : message.type === 'warning' ? '#F59E0B' : '#EF4444' }]}>
            {message.text}
          </Text>
        </View>
      )}

      {scanError && (
        <View style={[styles.messageBox, styles.messageError]}>
          <FontAwesome5 name="exclamation-circle" size={20} color="#EF4444" />
          <Text style={[styles.messageText, { color: '#EF4444' }]}>{scanError}</Text>
        </View>
      )}

      {!scannedId && (
        <View style={styles.scannerWrapper}>
          <div
            id="reader"
            style={{
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto',
              borderRadius: 16,
              overflow: 'hidden',
              border: scanning ? '2px solid rgba(139,92,246,0.4)' : '2px solid transparent',
              transition: 'border-color 0.2s',
            }}
          />

          {scanning && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '360px',
                margin: '-4px auto 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '8px',
                  pointerEvents: 'none',
                  border: '2px solid rgba(139,92,246,0.6)',
                  borderRadius: 12,
                  zIndex: 10,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: '180px',
                  height: '180px',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA', borderRadius: '4px 0 0 0' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderTop: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 4px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 24, height: 24, borderBottom: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA', borderRadius: '0 0 0 4px' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 0 4px 0' }} />
              </div>
            </div>
          )}

          {!scanning && (
            <View style={styles.scanActions}>
              <Pressable onPress={startScanner} style={styles.primaryBtn}>
                <FontAwesome5 name="camera" size={16} color="#FFF" />
                <Text style={styles.btnText}>Start Camera Scan</Text>
              </Pressable>
              <Pressable onPress={() => fileInputRef.current?.click()} style={styles.secondaryBtn}>
                <FontAwesome5 name="image" size={15} color="#C4B5FD" />
                <Text style={styles.secondaryText}>Scan an Image File</Text>
              </Pressable>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </View>
          )}

          {scanning && (
            <View style={styles.scanActions}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={toggleTorch} style={[styles.iconBtn, torchOn && styles.iconBtnActive]}>
                  <FontAwesome5 name="bolt" size={16} color={torchOn ? '#FBBF24' : '#C4B5FD'} />
                  <Text style={[styles.iconBtnText, torchOn && { color: '#FBBF24' }]}>{torchOn ? 'Flash On' : 'Flash Off'}</Text>
                </Pressable>
                <Pressable onPress={stopCamera} style={[styles.iconBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                  <FontAwesome5 name="stop" size={16} color="#FCA5A5" />
                  <Text style={[styles.iconBtnText, { color: '#FCA5A5' }]}>Stop</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {scannedId && (
        <View style={styles.scannerWrapper}>
          <View style={styles.resultCard}>
            <View style={styles.resultIconWrap}>
              <FontAwesome5 name="qrcode" size={32} color="#A78BFA" />
            </View>
            <Text style={styles.resultLabel}>Order scanned</Text>
            <Text style={styles.resultId}>{scannedId}</Text>

            <Pressable
              onPress={handleFulfill}
              disabled={fulfilling}
              style={styles.fulfillBtn}
            >
              {fulfilling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Fulfill Order</Text>}
            </Pressable>

            <Pressable
              onPress={handleReset}
              disabled={fulfilling}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Scan Another</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  headerRow: { width: '100%', maxWidth: 400, marginBottom: 20 },
  header: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  scannerWrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scanActions: { width: '100%', maxWidth: 360, marginTop: 14 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#8B5CF6', width: '100%', padding: 15, borderRadius: 12,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(139,92,246,0.12)', width: '100%', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)',
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  secondaryText: { color: '#C4B5FD', fontSize: 14, fontWeight: '600' },
  iconBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 13, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)', backgroundColor: 'rgba(139,92,246,0.06)',
  },
  iconBtnActive: {
    borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.1)',
  },
  iconBtnText: { color: '#C4B5FD', fontSize: 13, fontWeight: '600' },
  resultCard: {
    width: '100%', maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 28, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
  },
  resultIconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    marginBottom: 14,
  },
  resultLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  resultId: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 24 },
  fulfillBtn: {
    backgroundColor: '#10B981', width: '100%', padding: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 10,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', padding: 15,
    borderRadius: 12, alignItems: 'center',
  },
  cancelText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  messageBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
    marginBottom: 16, width: '100%', maxWidth: 400,
  },
  messageSuccess: { backgroundColor: 'rgba(16,185,129,0.1)' },
  messageWarning: { backgroundColor: 'rgba(245,158,11,0.1)' },
  messageError: { backgroundColor: 'rgba(239,68,68,0.1)' },
  messageText: { fontSize: 14, fontWeight: '500', flex: 1 },
});
