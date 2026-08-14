# StudentAlumni.ai — Unified Analytics Package (`src/analytics`)

Unified, provider-agnostic analytics architecture emitting to **Firebase Analytics** and **PostHog**.

## Architecture & Design Decisions
- **One Call Site**: All events pass through `track(EVENT, props)` -> Dispatcher -> `[FirebaseProvider, PostHogProvider, ConsoleProvider]`.
- **Phase 1 Web + Native-Ready**: Platform-split modules (`*.web.ts` and `*.native.ts` stubs) ensure zero architecture rewrite when mobile ships in Phase 2.
- **Zero-PII**: Automatic sanitizer redacting email, phone, roll numbers, names (in card contexts), and truncating to 100 chars.
- **Registry Driven**: Pre-defined element IDs in `ANALYTICS_IDS` registry.

---

## Usage Examples

### 1. Button / Link Click Tracking (`<Trackable>`)

```tsx
import { Trackable, ANALYTICS_IDS } from '@/src/analytics';

export function SubmitButton({ onSave }: { onSave: () => void }) {
  return (
    <Trackable
      id={ANALYTICS_IDS.echo.register.btn.submit}
      label="Register Now"
      props={{ echo_id: 'echo_123', amount: 499 }}
      onPress={onSave}
    >
      <button className="btn-primary">Register Now</button>
    </Trackable>
  );
}
```

### 2. Card with Impression Tracking (`<TrackedCard>`)

```tsx
import { TrackedCard, ANALYTICS_IDS } from '@/src/analytics';

export function MentorCard({ mentor }: { mentor: any }) {
  return (
    <TrackedCard
      id={ANALYTICS_IDS.mentor.list.card.profile}
      analyticsProps={{ mentor_id: mentor.id, match_score: mentor.score }}
      onPress={() => navigateToProfile(mentor.id)}
    >
      <div className="card">
        <h3>{mentor.title}</h3>
      </div>
    </TrackedCard>
  );
}
```

### 3. Multi-Step Form Funnel (`useFormAnalytics` + `useFlow`)

```tsx
import { useFormAnalytics, useFlow } from '@/src/analytics';

export function OnboardingStep({ stepIndex }: { stepIndex: number }) {
  const { trackFormStart, trackFieldComplete, trackFormSubmit } = useFormAnalytics('onboarding_form');
  const { trackStep } = useFlow('onboarding_flow', 4);

  const handleFocus = () => trackFormStart('role');

  const handleSubmit = () => {
    trackFormSubmit({ completed_step: stepIndex });
    trackStep(stepIndex, 'role_select', 'completed');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onFocus={handleFocus} onBlur={(e) => trackFieldComplete('role', Boolean(e.target.value))} />
    </form>
  );
}
```

### 4. Screen View Tracking (`useScreenAnalytics`)

```tsx
import { useScreenAnalytics } from '@/src/analytics';

export default function EchoRegistrationScreen() {
  useScreenAnalytics('echo_registration', { surface: 'echo' });

  return <View>...</View>;
}
```
