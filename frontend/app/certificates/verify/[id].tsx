import React from 'react';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';
import { Platform } from 'react-native';
import CertificateVerifyPortal from './index';

function CertificateVerifyDetailRoute() {
  return <CertificateVerifyPortal />;
}

/**
 * Native guard — this route renders web-only UI. On iOS/Android show a
 * placeholder that opens the page on studentalumni.ai instead of crashing.
 */
export default function CertificateVerifyDetailRouteRoute() {
  if (Platform.OS !== 'web') return <WebOnlyRoute />;
  return <CertificateVerifyDetailRoute />;
}
