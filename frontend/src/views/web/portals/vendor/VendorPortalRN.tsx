import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, Platform, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { TopBar } from '@/src/views/web/portals/student/TopBar';
import { VendorSidebar } from '@/src/views/web/portals/vendor/components/VendorSidebar';
import { VendorDashboardView } from '@/src/views/web/portals/vendor/views/VendorDashboardView';
import { VendorCatalogView } from '@/src/views/web/portals/vendor/views/VendorCatalogView';
import { VendorScannerView } from '@/src/views/web/portals/vendor/views/VendorScannerView';
import { VendorOrdersView } from '@/src/views/web/portals/vendor/views/VendorOrdersView';
import { LinearGradient } from 'expo-linear-gradient';
import { SP } from '@/src/theme/apple';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { FontAwesome5 } from '@expo/vector-icons';

export function VendorPortalRN() {
  const router = useRouter();
  const { token, logout } = useVendorAuthStore();
  const { tab, go } = usePortalUrl();
  const active = tab || 'dashboard';
  const bp = useBreakpoint();
  
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 8);
  };

  React.useEffect(() => {
    if (!token) {
      router.replace('/vendor-portal/login');
    }
  }, [token, router]);

  if (!token) return null;

  const handleNav = (id: string) => {
    go(id);
  };

  const onLogout = () => {
    logout();
    router.replace('/vendor-portal/login');
  };

  const padH = bp.isPhone ? SP.md : SP.xxl;

  const mobileNavItems = [
    { id: 'dashboard', icon: 'chart-pie', label: 'Dashboard' },
    { id: 'catalog', icon: 'list', label: 'Catalog' },
    { id: 'scanner', icon: 'qrcode', label: 'Scanner' },
    { id: 'orders', icon: 'shopping-bag', label: 'Orders' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', flexDirection: 'row' }}>
      <LinearGradient
        pointerEvents="none"
        colors={['#08080F', '#0C0E1F', '#08080F']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      
      {!bp.isPhone && (
        <VendorSidebar activeView={active} onNavigate={handleNav} onLogout={onLogout} />
      )}
      
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar scrolled={scrolled} activeView={active} onAvatarPress={() => {}} onBellPress={() => {}} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: padH, paddingTop: SP.lg, paddingBottom: bp.isPhone ? 96 : 0 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={{ flex: 1, padding: bp.isPhone ? 8 : 40, gap: 20 }}>
            {active === 'dashboard' && <VendorDashboardView />}
            {active === 'catalog' && <VendorCatalogView />}
            {active === 'scanner' && <VendorScannerView />}
            {active === 'orders' && <VendorOrdersView />}
          </View>
        </ScrollView>
      </View>

      {bp.isPhone && (
        <View style={styles.mobileNav}>
          {mobileNavItems.map(item => {
            const isActive = active === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNav(item.id)}
                style={styles.navItem}
              >
                <FontAwesome5 name={item.icon} size={18} color={isActive ? '#A78BFA' : 'rgba(255,255,255,0.4)'} style={{ width: 22, textAlign: 'center' }} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>{item.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={onLogout} style={styles.navItem}>
            <FontAwesome5 name="sign-out-alt" size={18} color="rgba(255,255,255,0.4)" style={{ width: 22, textAlign: 'center' }} />
            <Text style={styles.navLabel}>Logout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(167,139,250,0.15)',
    backgroundColor: 'rgba(10,15,30,0.95)',
    paddingBottom: 8,
    paddingTop: 6,
    paddingHorizontal: 2,
    ...(Platform.OS === 'web' ? ({
      position: 'fixed' as any,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    } as any) : {}),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    minWidth: 0,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  navLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#A78BFA',
    fontFamily: 'DMSans_700Bold',
  },
});
