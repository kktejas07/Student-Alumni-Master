import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { FontAwesome5 } from '@expo/vector-icons';

export function VendorScannerView() {
  const { token } = useVendorAuthStore();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const scannerRef = useRef<any>(null);

  const [scanError, setScanError] = useState<string | null>(null);

  const startScanner = async () => {
    if (scannerRef.current) {
      try { scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
    setScanError(null);
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );
      scanner.render(
        (decodedText: string) => {
          scanner.pause(true);
          setScannedId(decodedText.trim());
        },
        () => {}
      );
      scannerRef.current = scanner;
    } catch (e: any) {
      setScanError(e?.message || 'Could not start camera scanner. Allow camera access and reload.');
      console.error('Scanner init failed', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      startScanner();
      return () => {
        if (scannerRef.current) {
          try { scannerRef.current.clear(); } catch (e) {}
          scannerRef.current = null;
        }
      };
    }
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
        startScanner();
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
    startScanner();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>QR Scanner</Text>
      <Text style={styles.subtitle}>Scan an order QR code to fulfill items</Text>

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

      <View style={styles.scannerWrapper}>
        <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: 16, overflow: 'hidden' }}></div>

        {scannedId && (
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
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
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
