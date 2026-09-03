import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { FontAwesome5 } from '@expo/vector-icons';

type Html5Qrcode = any;

export function VendorScannerView() {
  const { token } = useVendorAuthStore();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      try { scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async (cameraId?: string) => {
    if (scannerRef.current) await stopScanner();
    setScanError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      const config: any = { fps: 10, qrbox: { width: 250, height: 250 } };
      const onDetect = (decodedText: string) => {
        scannerRef.current?.stop().catch(() => {});
        setScanning(false);
        setScannedId(decodedText.trim());
      };
      const backCamera = await Html5Qrcode.getCameras().then(
        (cams: { id: string; label: string }[]) => {
          const back = [...cams].reverse().find(c => /back|rear/i.test(c.label)) || cams[cams.length - 1];
          return back ? back.id : undefined;
        },
        () => undefined
      );
      const camId = cameraId || backCamera;
      if (camId) {
        await scanner.start(camId, config, onDetect, () => {});
      } else {
        await scanner.start({ facingMode: "environment" } as any, config, onDetect, () => {});
      }
      setScanning(true);
    } catch (e: any) {
      setScanError(e?.message || 'Could not start camera scanner. Allow camera access and try again.');
      try { scannerRef.current?.clear(); } catch (_) {}
      scannerRef.current = null;
      setScanning(false);
      console.error('Scanner init failed', e);
    }
  };

  const stopCamera = async () => {
    await stopScanner();
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setScanError(null);
    setMessage(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      const decoded = await scanner.scanFile(file, true);
      await stopScanner();
      setScannedId(String(decoded).trim());
    } catch (err: any) {
      await stopScanner();
      setScanError('No QR code found in the selected image. Try another photo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

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
        body: { order_id: scannedId }
      });

      if (res.success) {
        setMessage({ text: 'Order fulfilled successfully!', type: 'success' });
        setScannedId(null);
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
          <Text style={styles.subtitle}>Scan an order QR code to fulfill items</Text>
        </View>
      </View>

      {message && (
        <View style={[styles.messageBox, message.type === 'success' ? styles.messageSuccess : styles.messageError]}>
          <FontAwesome5 name={message.type === 'success' ? 'check-circle' : 'exclamation-circle'} size={20} color={message.type === 'success' ? '#10B981' : '#EF4444'} />
          <Text style={[styles.messageText, { color: message.type === 'success' ? '#10B981' : '#EF4444' }]}>
            {message.text}
          </Text>
        </View>
      )}

      {scanError && (
        <View style={[styles.messageBox, styles.messageError]}>
          <FontAwesome5 name="exclamation-circle" size={20} color="#EF4444" />
          <Text style={[styles.messageText, { color: '#EF4444' }]}>
            {scanError}
          </Text>
        </View>
      )}

      {!scannedId && (
        <View style={styles.scannerWrapper}>
          <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: 16, overflow: 'hidden' }}></div>

          {!scanning && (
            <View style={styles.scanActions}>
              <Pressable onPress={() => startScanner()} style={styles.primaryBtn}>
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
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </View>
          )}

          {scanning && (
            <View style={styles.scanActions}>
              <Pressable onPress={stopCamera} style={styles.secondaryBtn}>
                <FontAwesome5 name="stop" size={15} color="#FCA5A5" />
                <Text style={[styles.secondaryText, { color: '#FCA5A5' }]}>Stop Camera</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {scannedId && (
        <View style={styles.scannerWrapper}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Scanned Order ID:</Text>
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
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  headerRow: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scannerWrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scanActions: {
    width: '100%',
    maxWidth: 400,
    marginTop: 16,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#8B5CF6',
    width: '100%',
    padding: 16,
    borderRadius: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(139,92,246,0.12)',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '600',
  },
  resultCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  resultId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 32,
  },
  fulfillBtn: {
    backgroundColor: '#10B981',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  messageSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  messageError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
  }
});
