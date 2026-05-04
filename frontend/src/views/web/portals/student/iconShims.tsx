/**
 * Icon Shims — drop-in replacements for `lucide-react-native` named imports
 * built on top of `@expo/vector-icons/MaterialCommunityIcons`.
 *
 * Why a shim?
 *   The Student Portal had ~14 files using lucide named imports like:
 *     import { Sparkles, Briefcase } from 'lucide-react-native';
 *   Switching the import path to this file keeps every existing call site
 *   working without rewriting JSX, while delivering the unified MCI look.
 *
 * Visual deltas vs lucide:
 *   - Slightly heavier strokes (line-art -> filled outline)
 *   - Consistent baseline grid with the rest of the app
 *   - Free of the lucide v1 stale glyphs (Wallet, ExternalLink, etc.)
 *
 * Usage:
 *   import { Sparkles, Wallet } from '../iconShims';
 *   <Sparkles size={14} color="#A78BFA" />
 *
 * All shimmed icons accept the same props as lucide's:
 *   { size?: number; color?: string; fill?: string; style?: any }
 */
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type IconProps = { size?: number; color?: string; fill?: string; style?: any };

// Tiny factory — produces a React component bound to a specific MCI glyph.
const make = (name: MCIName) => {
  const Comp: React.FC<IconProps> = ({ size = 16, color = '#fff', style }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
  );
  Comp.displayName = `Icon(${String(name)})`;
  return Comp;
};

// ── 1:1 mapping (lucide name → MCI glyph) ─────────────────────────────────
export const LayoutDashboard = make('view-dashboard-outline');
export const Sparkles        = make('auto-fix');
export const Briefcase       = make('briefcase-outline');
export const Users           = make('account-group-outline');
export const UsersRound      = make('account-group');
export const UserPlus        = make('account-plus-outline');
export const User            = make('account-outline');
export const Calendar        = make('calendar-blank-outline');
export const CalendarCheck   = make('calendar-check-outline');
export const Wallet          = make('wallet-outline');
export const Tag             = make('tag-outline');
export const CreditCard      = make('credit-card-outline');
export const GraduationCap   = make('school-outline');
export const Home            = make('home-outline');
export const ExternalLink    = make('open-in-new');
export const LogOut          = make('logout');
export const FileText        = make('file-document-outline');
export const FileSearch      = make('file-search-outline');
export const BookOpen        = make('book-open-page-variant-outline');
export const Bell            = make('bell-outline');
export const Search          = make('magnify');
export const ArrowRight      = make('arrow-right');
export const ArrowDown       = make('arrow-down');
export const ArrowUp         = make('arrow-up');
export const TrendingUp      = make('trending-up');
export const MapPin          = make('map-marker-outline');
export const Star            = make('star');
export const Check           = make('check');
export const CheckCircle     = make('check-circle-outline');
export const CheckCircle2    = make('check-circle');
export const ShieldCheck     = make('shield-check-outline');
export const IdCard          = make('card-account-details-outline');
export const Award           = make('trophy-outline');
export const Bookmark        = make('bookmark-outline');
export const BookmarkCheck   = make('bookmark-check');
export const RefreshCcw      = make('refresh');
export const Lock            = make('lock-outline');
export const Globe2          = make('earth');
export const Gift            = make('gift-outline');
export const Plus            = make('plus');
export const X               = make('close');
export const Clock           = make('clock-outline');
export const MessageSquare   = make('message-outline');
export const Settings        = make('cog-outline');
export const QrCode          = make('qrcode');
export const Github          = make('github');
export const Linkedin        = make('linkedin');
export const Eye             = make('eye-outline');
export const IndianRupee     = make('currency-inr');
export const Building2       = make('office-building-outline');
export const Plug            = make('power-plug-outline');

// ── Type alias replacement for lucide's `LucideIcon` type ─────────────────
export type LucideIcon = React.FC<IconProps>;
