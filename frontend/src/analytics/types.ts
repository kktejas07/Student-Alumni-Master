/**
 * frontend/src/analytics/types.ts
 *
 * Core TypeScript definitions and element descriptor builder for the unified analytics layer.
 */

import { EVENTS } from './constants/events';

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

export type Primitive = string | number | boolean | null | undefined;

export type EventProps = Record<string, Primitive>;

declare const ElementIdBrand: unique symbol;
export type ElementId = string & { readonly [ElementIdBrand]: typeof ElementIdBrand };

export function asElementId(id: string): ElementId {
  return id as ElementId;
}

export type SurfaceType =
  | 'global'
  | 'auth'
  | 'onboarding'
  | 'student'
  | 'alumni'
  | 'college'
  | 'mentor'
  | 'admin'
  | 'agentk'
  | 'echo'
  | 'marketing'
  | string;

export type ElementKind =
  | 'btn'
  | 'icon'
  | 'card'
  | 'link'
  | 'tab'
  | 'chip'
  | 'row'
  | 'text'
  | 'input'
  | 'toggle'
  | 'modal'
  | 'toast'
  | 'banner'
  | 'section'
  | 'slot'
  | 'avatar'
  | 'menu'
  | string;

export interface PropertyEnvelope {
  element_id?: string;
  element_type?: ElementKind;
  element_label?: string;
  screen?: string;
  screen_path?: string;
  previous_screen?: string;
  surface?: SurfaceType;
  area?: string;
  session_id: string;
  platform: 'ios' | 'android' | 'web';
  app_version: string;
  viewport_w?: number;
  viewport_h?: number;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation?: 'portrait' | 'landscape';
  theme?: string;
  locale?: string;
  user_role?: string;
  is_authenticated?: boolean;
  org_id?: string;
  timestamp_ms: number;
  [key: string]: Primitive;
}

export interface UserTraits {
  role?: string;
  org_id?: string;
  campus?: string;
  cohort_year?: number | string;
  plan_tier?: string;
  is_mentor?: boolean;
  is_alumni?: boolean;
  signup_source?: string;
  locale?: string;
  theme_pref?: string;
  [key: string]: Primitive;
}

export interface ElementDescriptor {
  id: string;
  type?: ElementKind;
  surface?: SurfaceType;
  area?: string;
  label?: string;
  events?: AnalyticsEvent[];
  emits?: AnalyticsEvent;
  flows?: string[];
  flowStep?: number;
  owner?: string;
  pii?: 'none' | 'label-unsafe' | 'restricted';
  sampling?: number;
  since?: string;
  deprecated?: {
    since: string;
    replacedBy: string;
    removeAfter: string;
  };
  aliases?: string[];
}

/**
 * Descriptor Registry Builder (Part 8.2)
 * One defineElement() call per interactive element for type safety, lifecycle tracking, and codegen.
 */
export function defineElement<T extends ElementDescriptor>(descriptor: T): Required<Pick<ElementDescriptor, 'id' | 'type' | 'surface' | 'area'>> & T {
  const parts = descriptor.id.split('.');
  const derivedSurface = (parts[1] || 'global') as SurfaceType;
  const derivedArea = parts[2] || 'general';
  const derivedType = (parts[3] || 'btn') as ElementKind;

  return {
    surface: derivedSurface,
    area: derivedArea,
    type: derivedType,
    events: [EVENTS.ELEMENT_CLICK],
    pii: 'none',
    ...descriptor,
  };
}
