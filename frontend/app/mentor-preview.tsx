/**
 * /mentor-preview — DEV-ONLY preview of the Mentor Portal dashboard so we can
 * visually verify the spec implementation without going through the full
 * role-based auth flow. Safe to delete later.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MentorDashboardView } from '@/src/views/web/MentorDashboardView';
import { Sidebar, NavItem } from '@/src/views/web/platform/components';
import {
  Home as HomeIcon, Users, Calendar, MessageCircle, User as UserIcon,
  DollarSign, Star, Plus,
} from 'lucide-react-native';

const NAV: NavItem[] = [
  { id: 'home',      Icon: HomeIcon,       label: 'Dashboard',    color: '#5EEAD4' },
  { id: 'students',  Icon: Users,          label: 'Students',     color: '#34D399' },
  { id: 'sessions',  Icon: Calendar,       label: 'Calendar',     color: '#A7F3D0' },
  { id: 'messages',  Icon: MessageCircle,  label: 'Messages',     color: '#60A5FA' },
  { id: 'profile',   Icon: UserIcon,       label: 'Profile',      color: '#F472B6' },
  { id: 'jobs',      Icon: DollarSign,     label: 'Earnings',     color: '#FCD34D' },
  { id: 'analytics', Icon: Star,           label: 'Feedback',     color: '#FB923C' },
  { id: 'create',    Icon: Plus,           label: 'Create Event', color: '#14B8A6' },
];

export default function MentorPreviewPage() {
  return (
    <LinearGradient
      colors={['#071412', '#0A1F1A', '#0F2E26'] as any}
      locations={[0, 0.5, 1] as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <Sidebar
        navItems={NAV}
        activeId="home"
        onNav={() => {}}
        brandSubtitle="Mentor Portal"
        bgColor={'rgba(10,26,22,0.95)'}
        railColor={'#14B8A6'}
        user={{
          initials: 'PS',
          primary: 'Dr. Priya Sharma',
          secondary: 'Approved Mentor · ⭐ 4.9',
          gradient: ['#14B8A6', '#0F766E'] as const,
        }}
      />
      <View style={{ flex: 1 }}>
        <MentorDashboardView
          userName="Dr. Priya Sharma"
          notifCount={2}
          onActionPress={() => {}}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
});
