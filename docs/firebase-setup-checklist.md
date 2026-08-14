# Firebase Analytics (GA4) Setup & Configuration Checklist

This checklist guides configuring Google Analytics 4 (GA4) / Firebase Analytics for **StudentAlumni.ai**.

## 1. GA4 Property & Firebase Project Setup
- [x] Firebase Web App initialized with `EXPO_PUBLIC_FIREBASE_*` configuration.
- [ ] Connect GA4 Property in Firebase Console (Project Settings → Integrations → Google Analytics).
- [ ] Set Data Retention to **14 Months** (Admin → Data Settings → Data Retention).
- [ ] Enable **Google Signals** for cross-device audience reporting.

## 2. Key Events (Conversions)
Mark the following 8 canonical events as **Key Events** (formerly Conversions) in GA4 (Admin → Data display → Key events):
1. `sign_up`
2. `login`
3. `onboarding_complete`
4. `echo_registration_complete`
5. `job_application_submit`
6. `mentor_booking_confirmed`
7. `coupon_applied`
8. `certificate_verified`

## 3. Custom Dimensions Registration
Register the following **Event-Scoped Custom Dimensions** (Admin → Data display → Custom definitions):

| Dimension Name | Scope | Event Parameter |
|---|---|---|
| `Element ID` | Event | `element_id` |
| `Element Type` | Event | `element_type` |
| `Surface` | Event | `surface` |
| `Area` | Event | `area` |
| `Screen Name` | Event | `screen` |
| `Breakpoint` | Event | `breakpoint` |
| `Flow ID` | Event | `flow_id` |
| `Flow Step Name` | Event | `flow_step_name` |

Register the following **User-Scoped Custom Dimensions**:
| Dimension Name | Scope | User Property |
|---|---|---|
| `User Role` | User | `user_role` |
| `Organization ID` | User | `org_id` |

## 4. BigQuery Export (Recommended)
- [ ] Link GA4 to BigQuery (Admin → Product Links → BigQuery Links).
- [ ] Enable daily export streaming for raw un-aggregated analytics events.

## 5. Verification via DebugView
- Open `https://student-alumni-app.com?analytics_debug=1` in your browser.
- Open Firebase Console → Analytics → DebugView to inspect live events.
