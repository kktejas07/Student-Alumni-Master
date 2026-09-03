import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { VendorPortalRN } from '@/src/views/web/portals/vendor/VendorPortalRN';

export default function VendorPortalIndex() {
  if (Platform.OS === 'web') return <Redirect href={"/vendor-portal/dashboard" as any} />;
  return <VendorPortalRN />;
}