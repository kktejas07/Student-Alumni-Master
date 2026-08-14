/**
 * frontend/src/analytics/core/dispatcher.ts
 *
 * Core Analytics Dispatcher — handles fan-out to providers, enrichment,
 * sanitization, validation, ring-buffer queueing, sampling, and offline replay.
 */

import { CONFIG } from '../config';
import { EVENTS } from '../constants/events';
import { ConsoleProvider } from '../providers/console';
import { FirebaseProvider } from '../providers/firebase';
import { PostHogProvider } from '../providers/posthog';
import { AnalyticsProvider } from '../providers/types';
import { UserTraits } from '../types';
import { buildStandardEnvelope, hashUserId } from './context';
import { sanitizeProps } from './sanitize';
import { loadOfflineQueue, saveOfflineQueue } from './storage';
import { validateEvent } from './validate';

export interface QueuedEvent {
  event: string;
  props: Record<string, any>;
  timestamp: number;
}

class AnalyticsDispatcher {
  private providers: AnalyticsProvider[] = [
    FirebaseProvider,
    PostHogProvider,
    ConsoleProvider,
  ];

  private queue: QueuedEvent[] = [];
  private flushTimer: any = null;
  private isInitialized = false;
  private recentEventsLog: QueuedEvent[] = []; // max 50 for DebugOverlay

  async init(): Promise<void> {
    if (this.isInitialized || !CONFIG.enabled) return;

    // Initialize all providers
    await Promise.all(this.providers.map((p) => p.init().catch(() => {})));
    this.isInitialized = true;

    // Load & replay offline queue
    const offlineEvents = await loadOfflineQueue();
    if (offlineEvents.length > 0) {
      for (const item of offlineEvents) {
        await this.dispatchToProviders(item.event, item.props);
      }
    }

    // Set up auto-flush timer
    this.scheduleFlush();

    // Web visibility & pagehide listener
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => {
        this.flushSync();
      });
      window.addEventListener('beforeunload', () => {
        this.flushSync();
      });
    }
  }

  /** Public dispatch method */
  async track(event: string, callerProps: Record<string, any> = {}): Promise<void> {
    if (!CONFIG.enabled) return;

    // 1. Sampling check
    if (!CONFIG.isDev && this.shouldSampleOut(event)) {
      return;
    }

    // 2. Build standard envelope
    const envelope = buildStandardEnvelope();

    // Derive surface & area from element_id if present
    const elementId = callerProps.element_id || callerProps.id;
    let derivedProps: Record<string, any> = {};

    if (elementId && typeof elementId === 'string') {
      const parts = elementId.split('.');
      derivedProps = {
        element_id: elementId,
        surface: parts[1] || 'global',
        area: parts[2] || 'general',
        element_type: parts[3] || callerProps.element_type || 'btn',
      };
    }

    const mergedProps = {
      ...envelope,
      ...derivedProps,
      ...callerProps,
    };

    // 3. Sanitize (PII scrub + truncation)
    const sanitizedProps = sanitizeProps(mergedProps, elementId);

    // 4. Validate in __DEV__
    validateEvent(event, sanitizedProps, elementId);

    // 5. Add to queue & debug log
    const queuedEvent: QueuedEvent = {
      event,
      props: sanitizedProps,
      timestamp: Date.now(),
    };

    this.queue.push(queuedEvent);
    this.addToDebugLog(queuedEvent);

    // Conversion events or immediate events flush immediately
    const isConversion =
      event === EVENTS.SIGN_UP ||
      event === EVENTS.LOGIN ||
      event === EVENTS.ONBOARDING_COMPLETE ||
      event === EVENTS.ECHO_REGISTRATION_COMPLETE ||
      event === EVENTS.JOB_APPLICATION_SUBMIT ||
      event === EVENTS.MENTOR_BOOKING_CONFIRMED ||
      event === EVENTS.CERTIFICATE_VERIFIED ||
      event === EVENTS.PURCHASE;

    if (isConversion || this.queue.length >= CONFIG.queue.maxBatchSize) {
      await this.flush();
    }
  }

  async identify(rawUserId: string, traits?: UserTraits): Promise<void> {
    if (!CONFIG.enabled) return;
    const hashedId = await hashUserId(rawUserId);
    const sanitizedTraits = traits ? sanitizeProps(traits as any) : {};

    await Promise.all(
      this.providers.map(async (p) => {
        try {
          await p.setUserId(hashedId);
          if (Object.keys(sanitizedTraits).length > 0) {
            await p.setUserProperties(sanitizedTraits as UserTraits);
          }
        } catch {
          /* swallow */
        }
      })
    );
  }

  async setUserProperties(props: UserTraits): Promise<void> {
    if (!CONFIG.enabled) return;
    const sanitizedTraits = sanitizeProps(props as any);

    await Promise.all(
      this.providers.map(async (p) => {
        try {
          await p.setUserProperties(sanitizedTraits as UserTraits);
        } catch {
          /* swallow */
        }
      })
    );
  }

  async reset(): Promise<void> {
    if (!CONFIG.enabled) return;
    await Promise.all(
      this.providers.map(async (p) => {
        try {
          await p.reset();
        } catch {
          /* swallow */
        }
      })
    );
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    for (const item of batch) {
      await this.dispatchToProviders(item.event, item.props);
    }

    await saveOfflineQueue(this.queue);
  }

  flushSync(): void {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    // Save remaining
    saveOfflineQueue([]);

    for (const item of batch) {
      this.dispatchToProviders(item.event, item.props);
    }
  }

  getDebugLog(): QueuedEvent[] {
    return [...this.recentEventsLog];
  }

  private async dispatchToProviders(event: string, props: Record<string, any>): Promise<void> {
    await Promise.all(
      this.providers.map(async (p) => {
        try {
          await p.logEvent(event, props);
        } catch {
          /* swallow */
        }
      })
    );
  }

  private shouldSampleOut(event: string): boolean {
    if (event === EVENTS.API_CALL) {
      return Math.random() > CONFIG.sampling.api_call;
    }
    if (event === EVENTS.LIST_INTERACTION) {
      return Math.random() > CONFIG.sampling.list_interaction;
    }
    return false; // never sample conversion, screen_view, element_click
  }

  private scheduleFlush() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, CONFIG.queue.flushIntervalMs);
  }

  private addToDebugLog(item: QueuedEvent) {
    this.recentEventsLog.unshift(item);
    if (this.recentEventsLog.length > 50) {
      this.recentEventsLog.pop();
    }
  }
}

export const dispatcher = new AnalyticsDispatcher();
