import React from 'react';
import { Platform } from 'react-native';
import LandingPage from '@/src/views/web/LandingPage';
import CertificateVerifyPortal from '../certificates/verify/index';

export default function VerifyPortalRoute() {
  if (Platform.OS === 'web') {
    return <LandingPage initialTab="verify" />;
  }
  return <CertificateVerifyPortal />;
}
