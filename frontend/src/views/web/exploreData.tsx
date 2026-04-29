/**
 * Curated explore-section data for Courses / Internships / Network / Resources.
 * Used by both web sub-screens and mobile tabs.
 */
import {
  Code, Brush, BarChart3, Globe, Cpu, Database, Smartphone, Cloud,
  GraduationCap, Rocket, Compass, Star, Building2, MapPin, BookOpenCheck,
  Briefcase, Users, MessageSquare, FileText, Award, Calendar, Shield,
  Lightbulb, TrendingUp, Heart, Music, Camera, Coffee, DollarSign,
  Stethoscope, Megaphone, Layers, Zap, BookOpen, PenTool, Send,
  PieChart, Cog, Trophy, Sparkles, Video, Paintbrush, Boxes,
} from 'lucide-react-native';
import type { ExploreSection, ExploreHeroTile } from './ExploreScreen';

const ICON = (Comp: any, color = '#FFFFFF') => <Comp size={24} color={color} strokeWidth={1.6} />;

// ─── Courses Explore ─────────────────────────────────────────────────────────
export const COURSES_HERO: ExploreHeroTile[] = [
  {
    id: 'h1',
    title: 'AI Career Track',
    subtitle: '12-week roadmap with mentors, projects & free certifications.',
    cta: 'Start free',
    emoji: '🤖',
    gradient: ['#5F259F', '#7C3AED', '#B07FDF'],
    span: 2,
  },
  {
    id: 'h2',
    title: 'Free this month',
    subtitle: '24 premium courses unlocked for students.',
    cta: 'Browse',
    emoji: '🎁',
    gradient: ['#10B981', '#34D399'],
    span: 1,
  },
];

export const COURSES_SECTIONS: ExploreSection[] = [
  {
    id: 'tech',
    title: 'Tech & Engineering',
    emoji: '💻',
    items: [
      { id: 'web',     label: 'Web Dev',          icon: ICON(Code) },
      { id: 'mobile',  label: 'Mobile Dev',       icon: ICON(Smartphone) },
      { id: 'ai',      label: 'AI / ML',          icon: ICON(Sparkles) },
      { id: 'data',    label: 'Data Science',     icon: ICON(Database) },
      { id: 'cloud',   label: 'Cloud',            icon: ICON(Cloud) },
      { id: 'cyber',   label: 'Cybersecurity',    icon: ICON(Shield) },
      { id: 'sysd',    label: 'System Design',    icon: ICON(Cpu) },
      { id: 'devops',  label: 'DevOps',           icon: ICON(Cog) },
    ],
  },
  {
    id: 'design',
    title: 'Design & Creative',
    emoji: '🎨',
    items: [
      { id: 'ui',     label: 'UI Design',         icon: ICON(Paintbrush) },
      { id: 'ux',     label: 'UX Research',       icon: ICON(Compass) },
      { id: 'figma',  label: 'Figma Mastery',     icon: ICON(PenTool) },
      { id: 'graphic',label: 'Graphic Design',    icon: ICON(Brush) },
      { id: 'video',  label: 'Video Editing',     icon: ICON(Video) },
      { id: 'photo',  label: 'Photography',       icon: ICON(Camera) },
      { id: 'motion', label: 'Motion Graphics',   icon: ICON(Zap) },
      { id: '3d',     label: '3D Modeling',       icon: ICON(Boxes) },
    ],
  },
  {
    id: 'business',
    title: 'Business & Career',
    emoji: '💼',
    items: [
      { id: 'pm',      label: 'Product Mgmt',     icon: ICON(Rocket) },
      { id: 'mkt',     label: 'Marketing',        icon: ICON(Megaphone) },
      { id: 'fin',     label: 'Finance',          icon: ICON(DollarSign) },
      { id: 'analytics', label: 'Analytics',      icon: ICON(BarChart3) },
      { id: 'startup', label: 'Startup',          icon: ICON(Lightbulb) },
      { id: 'sales',   label: 'Sales',            icon: ICON(TrendingUp) },
      { id: 'comms',   label: 'Communication',    icon: ICON(MessageSquare) },
      { id: 'lead',    label: 'Leadership',       icon: ICON(Trophy) },
    ],
  },
];

// ─── Internships Explore ─────────────────────────────────────────────────────
export const INTERNSHIPS_HERO: ExploreHeroTile[] = [
  {
    id: 'h1',
    title: 'Top matches just for you',
    subtitle: '42 roles match your career path & skills.',
    cta: 'See matches',
    emoji: '🎯',
    gradient: ['#7C3AED', '#B07FDF', '#EC4899'],
    span: 2,
  },
  {
    id: 'h2',
    title: 'Remote roles',
    subtitle: 'Work from anywhere',
    cta: 'Browse',
    emoji: '🌍',
    gradient: ['#1D4ED8', '#3B82F6', '#60A5FA'],
    span: 1,
  },
];

export const INTERNSHIPS_SECTIONS: ExploreSection[] = [
  {
    id: 'role',
    title: 'By Role',
    emoji: '👔',
    items: [
      { id: 'eng',     label: 'Engineering',     icon: ICON(Code) },
      { id: 'design',  label: 'Design',          icon: ICON(Paintbrush) },
      { id: 'pm',      label: 'Product',         icon: ICON(Rocket) },
      { id: 'ds',      label: 'Data',            icon: ICON(BarChart3) },
      { id: 'mkt',     label: 'Marketing',       icon: ICON(Megaphone) },
      { id: 'fin',     label: 'Finance',         icon: ICON(DollarSign) },
      { id: 'ops',     label: 'Operations',      icon: ICON(Cog) },
      { id: 'sales',   label: 'Sales',           icon: ICON(TrendingUp) },
    ],
  },
  {
    id: 'industry',
    title: 'By Industry',
    emoji: '🏭',
    items: [
      { id: 'fintech', label: 'FinTech',         icon: ICON(DollarSign) },
      { id: 'healthtech', label: 'HealthTech',   icon: ICON(Stethoscope) },
      { id: 'edtech',  label: 'EdTech',          icon: ICON(GraduationCap) },
      { id: 'ecom',    label: 'E-commerce',      icon: ICON(Boxes) },
      { id: 'media',   label: 'Media',           icon: ICON(Video) },
      { id: 'gaming',  label: 'Gaming',          icon: ICON(Sparkles) },
      { id: 'climate', label: 'Climate',         icon: ICON(Heart) },
      { id: 'consult', label: 'Consulting',      icon: ICON(Briefcase) },
    ],
  },
  {
    id: 'company',
    title: 'Top Companies',
    emoji: '⭐',
    items: [
      { id: 'unicorns', label: 'Unicorns',        icon: ICON(Star) },
      { id: 'mnc',      label: 'MNCs',            icon: ICON(Globe) },
      { id: 'startup',  label: 'Startups',        icon: ICON(Rocket) },
      { id: 'remote',   label: 'Remote-first',    icon: ICON(MapPin) },
      { id: 'paid',     label: 'Paid only',       icon: ICON(DollarSign) },
      { id: 'ppo',      label: 'PPO offers',      icon: ICON(Award) },
      { id: 'usabuyers',label: 'Hiring abroad',   icon: ICON(Send) },
      { id: 'verified', label: 'Verified',        icon: ICON(Shield) },
    ],
  },
];

// ─── Network Explore ─────────────────────────────────────────────────────────
export const NETWORK_HERO: ExploreHeroTile[] = [
  {
    id: 'h1',
    title: 'Find a Mentor',
    subtitle: 'Browse 500+ verified mentors. Book 1:1 sessions instantly.',
    cta: 'Find mentor',
    emoji: '🤝',
    gradient: ['#10B981', '#34D399', '#86EFAC'],
    span: 2,
  },
  {
    id: 'h2',
    title: 'Knowledge Rooms',
    subtitle: 'Live discussions',
    cta: 'Join',
    emoji: '💬',
    gradient: ['#F59E0B', '#FCD34D'],
    span: 1,
  },
];

export const NETWORK_SECTIONS: ExploreSection[] = [
  {
    id: 'connect',
    title: 'Connect',
    emoji: '🤝',
    items: [
      { id: 'mentors',  label: 'Mentors',         icon: ICON(Users) },
      { id: 'alumni',   label: 'Alumni',          icon: ICON(GraduationCap) },
      { id: 'peers',    label: 'Peers',           icon: ICON(Heart) },
      { id: 'experts',  label: 'Industry Experts',icon: ICON(Star) },
      { id: 'rooms',    label: 'Rooms',           icon: ICON(MessageSquare) },
      { id: 'groups',   label: 'Study Groups',    icon: ICON(BookOpenCheck) },
      { id: 'colleges', label: 'Colleges',        icon: ICON(Building2) },
      { id: 'recruiter',label: 'Recruiters',      icon: ICON(Briefcase) },
    ],
  },
  {
    id: 'discover',
    title: 'Discover',
    emoji: '✨',
    items: [
      { id: 'events',   label: 'Events',          icon: ICON(Calendar) },
      { id: 'live',     label: 'Live Sessions',   icon: ICON(Video) },
      { id: 'qna',      label: 'Q&A',             icon: ICON(Lightbulb) },
      { id: 'spotlight',label: 'Spotlight',       icon: ICON(Sparkles) },
      { id: 'hackathons',label: 'Hackathons',     icon: ICON(Trophy) },
      { id: 'circles',  label: 'Circles',         icon: ICON(Layers) },
      { id: 'panels',   label: 'Panels',          icon: ICON(Megaphone) },
      { id: 'fests',    label: 'College Fests',   icon: ICON(Music) },
    ],
  },
  {
    id: 'tools',
    title: 'Build Your Profile',
    emoji: '🧰',
    items: [
      { id: 'resume',   label: 'Resume',          icon: ICON(FileText) },
      { id: 'portfolio',label: 'Portfolio',       icon: ICON(Layers) },
      { id: 'skills',   label: 'Skills',          icon: ICON(Award) },
      { id: 'cert',     label: 'Certifications',  icon: ICON(Trophy) },
      { id: 'projects', label: 'Projects',        icon: ICON(Rocket) },
      { id: 'linkedin', label: 'LinkedIn Boost',  icon: ICON(Send) },
      { id: 'mockint',  label: 'Mock Interviews', icon: ICON(MessageSquare) },
      { id: 'reviews',  label: 'CV Review',       icon: ICON(BookOpen) },
    ],
  },
];
