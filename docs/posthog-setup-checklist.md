# PostHog Product Analytics & Session Replay Setup Checklist

This checklist guides configuring PostHog for **StudentAlumni.ai**.

## 1. PostHog Project Setup
- [x] Configure `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`.
- [x] Set Person Profiles mode to `identified_only` to control billing costs.
- [x] Configure Session Replay masking: `maskAllInputs: true`, `maskTextSelector: '[data-ph-mask]'`.

## 2. Core Funnels Configuration
Create the following 4 core conversion funnels in PostHog:

### 1. ECHO Event Registration Funnel
1. `element_click` where `element_id = sa.echo.list.card.event`
2. `element_click` where `element_id = sa.echo.register.btn.start`
3. `flow_step` where `flow_step_name = track_select`
4. `element_click` where `element_id = sa.echo.payment.chip.method`
5. `echo_registration_complete`

### 2. Onboarding Funnel
1. `sign_up`
2. `flow_step` where `flow_step_name = role_select`
3. `flow_step` where `flow_step_name = campus_select`
4. `onboarding_complete`

### 3. Mentor Booking Funnel
1. `element_impression` where `element_id = sa.mentor.list.card.profile`
2. `element_click` where `element_id = sa.mentor.profile.btn.book-session`
3. `element_click` where `element_id = sa.mentor.calendar.slot.select`
4. `mentor_booking_confirmed`

### 4. Job Application Funnel
1. `element_impression` where `element_id = sa.jobs.list.card.job`
2. `element_click` where `element_id = sa.jobs.detail.btn.apply`
3. `job_application_submit`

## 3. Trends Insights & Dashboards
- Create **Element Performance Trend Insight**: count of `element_click` broken down by `element_id`.
- Create **CTR Insight**: count of `element_click` divided by `element_impression` grouped by `element_id`.
