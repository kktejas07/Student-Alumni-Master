/**
 * StudentDashboardMobileView — native-feel mobile dashboard.
 *
 * Fully overhauled to feature a modern glassmorphism aesthetic, carousels,
 * and live integrations with the Jobs, Events, and Courses APIs.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, Pressable, ScrollView, Animated, Easing, ActivityIndicator, Dimensions} from 'react-native';
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
      toValue: 1, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: Platform.OS !== 'web',
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
    <ScrollView className="flex-1 bg-navy" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: 32 }}>
        
        {/* ─── Top Header ────────────────────────────────────────────── */}
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="font-body-medium text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome back,</Text>
            <Text className="text-white font-body-bold text-2xl tracking-tight mt-1">{userName}</Text>
          </View>
          <View className="flex-row gap-3 items-center">
            <Pressable onPress={onOpenNotifications} className="items-center justify-center relative" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Bell size={18} color="#F8FAFC" />
              {notifCount > 0 && <View className="absolute -top-0.5 -right-0.5 rounded-full items-center justify-center" style={{ backgroundColor: '#EF4444', minWidth: 20, height: 20, borderWidth: 2, borderColor: '#050505' }}><Text className="text-white text-xs font-body-bold">{notifCount}</Text></View>}
            </Pressable>
            <Pressable onPress={onOpenProfile} className="rounded-2xl overflow-hidden items-center justify-center" style={{ width: 44, height: 44 }}>
              <LinearGradient colors={['#A78BFA', '#7C3AED']} className="absolute inset-0" />
              <Text className="text-white font-body-bold text-sm">{userName.substring(0, 2).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── Live Jobs Carousel ────────────────────────────────────── */}
        <View>
          <Text className="font-body-bold text-xs tracking-widest mb-4 uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>LIVE JOBS & INTERNSHIPS</Text>
          {jobsLoading ? <ActivityIndicator color="#A78BFA" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 20 }}>
              {jobs.map((job: any, i: number) => (
                <Pressable key={i} className="rounded-3xl overflow-hidden relative" style={{ width: CARD_WIDTH, padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} onPress={() => onActionPress?.(`job-${job.job_id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} className="absolute inset-0" />
                  <View className="flex-row justify-between items-center mb-4">
                    <Briefcase size={20} color="#60A5FA" />
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(96,165,250,0.15)' }}><Text className="text-xs font-body-bold uppercase" style={{ color: '#DBEAFE' }}>{job.job_type || 'Job'}</Text></View>
                  </View>
                  <Text className="text-white font-body-bold text-lg mb-1.5 leading-6" numberOfLines={2}>{job.title}</Text>
                  <Text className="font-body-medium text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{job.company}</Text>
                  <View className="flex-row gap-4 border-t pt-4" style={{ borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <View className="flex-row items-center gap-1.5">
                      <MapPin size={12} color="rgba(255,255,255,0.5)" />
                      <Text className="font-body-medium text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{job.location || 'Remote'}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={12} color="rgba(255,255,255,0.5)" />
                      <Text className="font-body-medium text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{job.work_mode || 'Flexible'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── Upcoming Events Carousel ──────────────────────────────── */}
        <View>
          <Text className="font-body-bold text-xs tracking-widest mb-4 uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>UPCOMING EVENTS</Text>
          {eventsLoading ? <ActivityIndicator color="#F472B6" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 20 }}>
              {events.map((event: any, i: number) => (
                <Pressable key={i} className="rounded-3xl overflow-hidden relative" style={{ width: CARD_WIDTH, padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} onPress={() => onActionPress?.(`event-${event.event_id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} className="absolute inset-0" />
                  <View className="flex-row justify-between items-center mb-4">
                    <Calendar size={20} color="#F472B6" />
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(244,114,182,0.15)' }}><Text className="text-xs font-body-bold uppercase" style={{ color: '#FBCFE8' }}>{event.event_type || 'Event'}</Text></View>
                  </View>
                  <Text className="text-white font-body-bold text-lg mb-1.5 leading-6" numberOfLines={2}>{event.title}</Text>
                  <Text className="font-body-medium text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{event.organizer_name}</Text>
                  <View className="flex-row gap-4 border-t pt-4" style={{ borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <View className="flex-row items-center gap-1.5">
                      <MapPin size={12} color="rgba(255,255,255,0.5)" />
                      <Text className="font-body-medium text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{event.location_city || 'Online'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── Trending Courses Carousel ─────────────────────────────── */}
        <View>
          <Text className="font-body-bold text-xs tracking-widest mb-4 uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>TRENDING COURSES</Text>
          {coursesLoading ? <ActivityIndicator color="#34D399" /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 20 }}>
              {courses.map((course: any, i: number) => (
                <Pressable key={i} className="rounded-3xl overflow-hidden relative" style={{ width: CARD_WIDTH, padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} onPress={() => onActionPress?.(`course-${course.id}`)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} className="absolute inset-0" />
                  <View className="flex-row justify-between items-center mb-4">
                    <BookOpen size={20} color="#34D399" />
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(52,211,153,0.15)' }}><Text className="text-xs font-body-bold uppercase" style={{ color: '#A7F3D0' }}>{course.category || 'Learning'}</Text></View>
                  </View>
                  <Text className="text-white font-body-bold text-lg mb-1.5 leading-6" numberOfLines={2}>{course.title}</Text>
                  <Text className="font-body-medium text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{course.provider?.name}</Text>
                  <View className="flex-row gap-4 border-t pt-4" style={{ borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="font-body-bold text-xs" style={{ color: '#10B981' }}>
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
