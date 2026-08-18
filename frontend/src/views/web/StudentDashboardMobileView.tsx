/**
 * StudentDashboardMobileView — native-feel mobile dashboard.
 *
 * Fully overhauled to feature a modern glassmorphism aesthetic, carousels,
 * and live integrations with the Jobs, Events, and Courses APIs.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Briefcase, Calendar, BookOpen, MapPin, Clock
} from 'lucide-react-native';
import { usePortalData } from '@/src/lib/portalApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 500 ? 300 : width * 0.75;

interface Props {
  userName?: string;
  notifCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onActionPress?: (id: string) => void;
}

export function StudentDashboardMobileView({
  userName = 'there', notifCount = 3, onOpenNotifications, onOpenProfile, onActionPress,
}: Props) {
  // ─── Stagger entry animation ───────────────────────────────────────────
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true,
    }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  // ─── Live Data Fetching ──────────────────────────────────────────────
  const { data: jobsData, loading: jobsLoading } = usePortalData<any>('/jobs/feed?per_page=5', { items: [] }, 60000);
  const { data: eventsData, loading: eventsLoading } = usePortalData<any>('/events/search?limit=5', { results: [] }, 60000);
  const { data: coursesData, loading: coursesLoading } = usePortalData<any>('/courses/list?sort=popular&limit=5', { courses: [] }, 60000);

  const jobs = jobsData?.items || [];
  const events = eventsData?.results || [];
  const courses = coursesData?.courses || [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: 32 }}>
        
        {/* ─── Top Header ────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{userName}</Text>
          </View>
          <View style={styles.topBarActions}>
            <Pressable onPress={onOpenNotifications} style={styles.glassBtn}>
              <Bell size={18} color="#F8FAFC" />
              {notifCount > 0 && <View style={styles.notifDot}><Text style={styles.notifDotText}>{notifCount}</Text></View>}
            </Pressable>
            <Pressable onPress={onOpenProfile} style={styles.avatar}>
              <LinearGradient colors={['#60A5FA', '#2563EB']} style={StyleSheet.absoluteFill} />
              <Text style={styles.avatarText}>{userName.substring(0, 2).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── Live Jobs Carousel ────────────────────────────────────── */}
        <View>
          <Text style={styles.sectionTitle}>LIVE JOBS & INTERNSHIPS</Text>
          {jobsLoading ? <ActivityIndicator color="#60A5FA" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrap}>
              {jobs.map((job: any, i: number) => (
                <Pressable key={i} style={styles.glassCard} onPress={() => onActionPress?.(`job-${job.job_id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.cardHeader}>
                    <Briefcase size={20} color="#60A5FA" />
                    <View style={styles.badge}><Text style={styles.badgeText}>{job.job_type || 'Job'}</Text></View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{job.title}</Text>
                  <Text style={styles.cardSubtitle}>{job.company}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                      <MapPin size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.footerText}>{job.location || 'Remote'}</Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Clock size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.footerText}>{job.work_mode || 'Flexible'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── Upcoming Events Carousel ──────────────────────────────── */}
        <View>
          <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>
          {eventsLoading ? <ActivityIndicator color="#F472B6" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrap}>
              {events.map((event: any, i: number) => (
                <Pressable key={i} style={styles.glassCard} onPress={() => onActionPress?.(`event-${event.event_id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.cardHeader}>
                    <Calendar size={20} color="#F472B6" />
                    <View style={[styles.badge, {backgroundColor: 'rgba(244,114,182,0.15)'}]}>
                      <Text style={[styles.badgeText, {color: '#FBCFE8'}]}>{event.event_type || 'Event'}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.cardSubtitle}>{event.organizer_name}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                      <MapPin size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.footerText}>{event.location_city || 'Online'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── Trending Courses Carousel ─────────────────────────────── */}
        <View>
          <Text style={styles.sectionTitle}>TRENDING COURSES</Text>
          {coursesLoading ? <ActivityIndicator color="#34D399" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrap}>
              {courses.map((course: any, i: number) => (
                <Pressable key={i} style={styles.glassCard} onPress={() => onActionPress?.(`course-${course.id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.cardHeader}>
                    <BookOpen size={20} color="#34D399" />
                    <View style={[styles.badge, {backgroundColor: 'rgba(52,211,153,0.15)'}]}>
                      <Text style={[styles.badgeText, {color: '#A7F3D0'}]}>{course.category || 'Learning'}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.cardSubtitle}>{course.provider?.name}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                      <Text style={[styles.footerText, {color: '#10B981', fontFamily: 'DMSans_700Bold'}]}>
                        {course.pricing?.type === 'free' ? 'Free Course' : 'Pro Course'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

      </Animated.View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // Header
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  name: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.5, marginTop: 4 },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  
  glassBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#050505'
  },
  notifDotText: { color: '#FFF', fontSize: 10, fontFamily: 'DMSans_700Bold' },
  avatar: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  
  // Sections
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_700Bold', fontSize: 12,
    letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase'
  },
  carouselWrap: { gap: 16, paddingRight: 20 },
  
  // Glass Cards
  glassCard: {
    width: CARD_WIDTH, padding: 20, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', position: 'relative'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badge: { backgroundColor: 'rgba(96,165,250,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#DBEAFE', fontSize: 11, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' },
  
  cardTitle: { color: '#FFF', fontSize: 18, fontFamily: 'DMSans_700Bold', marginBottom: 6, lineHeight: 24 },
  cardSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'DMSans_500Medium', marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'DMSans_500Medium' }
});
