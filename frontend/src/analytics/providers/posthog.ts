/**
 * frontend/src/analytics/providers/posthog.ts
 *
 * Re-exports platform-specific PostHog provider.
 */

export {
  PostHogWebProvider as PostHogProvider,
  setPostHogGroup,
  getPostHogFeatureFlag,
} from './posthog.web';
