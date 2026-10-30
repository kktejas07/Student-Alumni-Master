# Student Alumni API — Spec & Audit

_Auto-updated 2026-05-03 (Phase B)._

---

## 1. Auth & Onboarding

| Method | Path                              | Description                                     | Auth |
|--------|-----------------------------------|-------------------------------------------------|------|
| POST   | `/api/auth/check-email`           | Smart email-detect (login vs register routing)  | none |
| POST   | `/api/auth/register`              | New user signup (DOB & phone collected here)    | none |
| POST   | `/api/auth/login`                 | Login (returns access + refresh tokens)         | none |
| POST   | `/api/auth/refresh`               | Refresh access token                            | refresh |
| GET    | `/api/auth/me`                    | Current user (decrypted PII)                    | bearer |
| POST   | `/api/users/onboarding`           | Submit role-specific onboarding payload         | bearer |

### Register payload
```json
{
  "email": "alice@iitb.ac.in",
  "password": "TestPass@123",
  "full_name": "Alice Singh",
  "role": "mentor",
  "phone": "+919999998877",
  "dob": "1995-06-15",
  "country_code": "IN",
  "postal_code": "400076"
}
```

### Date-of-Birth validation
* Format: ISO 8601 `YYYY-MM-DD`
* Future dates rejected with HTTP 422
* Min age **18** for mentor / alumni / college roles
* Min age **13** for student role

---

## 2. Encryption-at-Rest

Sensitive PII (`phone`, `dob`, `postal_code`) is encrypted on the way into MongoDB
using **Fernet (AES-128-CBC + HMAC-SHA256)**. The encryption key lives in
`backend/.env` as `FERNET_KEY` (rotatable). Ciphertext is prefixed with
`enc::` so downstream code can detect & decrypt only what it produced.

Decryption happens transparently in `serialize_user()` so all client-facing
responses see plaintext. Audit log entries also store encrypted ciphertext for
the same fields.

---

## 3. Audit Logs

### Schema (`db.audit_logs`)
| Field              | Type      | Description |
|--------------------|-----------|-------------|
| `user_id`          | string    | Mongo `_id` of the affected user |
| `field_name`       | string    | e.g. `phone`, `mentor_info`, `dob` |
| `old_value`        | any       | Previous value (null on first write) |
| `new_value`        | any       | New value (encrypted for sensitive fields) |
| `source`           | string    | One of: `register`, `onboarding`, `profile`, `admin` |
| `validation_status`| string    | `passed` / `failed` |
| `is_manual_entry`  | bool      | True when the user typed via "Other" |
| `ts`               | datetime  | UTC ISO timestamp |

### Endpoints
| Method | Path                       | Description                     | Auth |
|--------|----------------------------|---------------------------------|------|
| GET    | `/api/audit-logs/me`       | Calling user's own change history | bearer |

Query params: `limit` (max 500, default 100), `skip` (default 0).
Response: `{ total: int, items: [{ field_name, old_value, new_value, source, validation_status, is_manual_entry, ts }] }`

---

## 4. Country-Aware Validation

### Postal / PIN code regex map (frontend `pinCode.ts`)
| Country | Sample      | Rule                         |
|---------|-------------|------------------------------|
| IN      | 110001      | `^[1-9]\d{5}$` |
| US      | 10001-1234  | `^\d{5}(-\d{4})?$` |
| GB      | SW1A 1AA    | `^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$` |
| CA      | K1A 0B1     | `^[A-CEGHJ-NPR-TVXY]\d[A-Z]\s?\d[A-Z]\d$` |
| AU      | 2000        | `^\d{4}$` |
| DE / FR / IT / ES / NL / KR / FI / MX | 5 digits | `^\d{5}$` |
| JP      | 100-0001    | `^\d{3}-?\d{4}$` |
| BR      | 01000-000   | `^\d{5}-?\d{3}$` |
| _other_ | _any_       | `^[A-Z\d \-]{3-10}$` (permissive fallback) |

(33 countries total — see `/app/frontend/src/utils/pinCode.ts` for full list.)

### Phone-number length rules
National-number digit counts (excluding dial code):
* IN, US, CA: 10
* GB, AU, MX: 9-11
* SG: 8
* DE, FR: 9-11
* + ~25 more in `validatePhoneLength()` helper

---

## 5. Role-Specific Pydantic Schemas (current state)

### `MentorInfo` (16 fields)
- `category`, `categories` (multi-select, 13 archetypes incl. interview_prep, creative_design, life_wellness)
- `organization`, `job_title`, `years_of_experience`, `linkedin_url`, `bio`, `session_price_inr`
- `education_level`, `expertise[]`, `availability[]`, `profile_photo`, `college`, `college_batch`

### `AlumniInfo` (18 fields)
- `graduation_year`, `university`, `current_employer`, `current_role`, `employment_status`, `linkedin_url`
- `wants_to_mentor`, `mentor_category`, `mentor_categories[]`
- `years_of_experience`, `domain_expertise[]`, `tech_skills[]`, `business_skills[]`, `soft_skills[]`
- `next_chapter` (one of 6 paths), `profile_photo`, `bio`, `writing_style`

### `CollegeInfo` (24 fields)
- `institution_name`, `institution_type`, `affiliated_university`, `official_website`
- `city`, `state`, `country`, `accreditation`, `year_established`
- `ranking_tier` (top_50 / top_51_200 / top_201_500 / not_ranked)
- `accreditations[]`, `contact_name`, `contact_designation`, `contact_official_email`, `contact_phone`
- `features_needed[]` (6 slugs), `logo`, `cover_photo`, `bio`, `writing_style`

### `User` (extended in Phase A/B)
- All core fields plus `dob`, `country_code`, `postal_code` (last 3 — `dob`, `postal_code` encrypted at rest; `phone` encrypted too)

---

## 6. Frontend Component Catalogue

| Component                                | Path                                                | Purpose |
|------------------------------------------|-----------------------------------------------------|---------|
| `OptionListCard`                         | `src/views/components/OptionListCard.tsx`           | Canonical dark-theme option list (Institution Type design) |
| `Dropdown`                               | `src/views/web/Dropdown.tsx`                        | Modal selector built on OptionListCard + "Other" fallback |
| `SuggestionAutocomplete`                 | `src/views/web/SuggestionAutocomplete.tsx`          | Search-as-you-type built on OptionListCard |
| `InstitutionAutocomplete`                | `src/views/web/InstitutionAutocomplete.tsx`         | Photon API live search + manual fallback |
| `PhoneInput`                             | `src/views/web/PhoneInput.tsx`                      | 40-country phone input with flag + dial code |
| `DateOfBirthPicker`                      | `src/views/web/DateOfBirthPicker.tsx`               | DD/MM/YYYY 3-dropdown picker, leap-year aware |
| `RoleThemeContext`                       | `src/views/auth/RoleTheme.tsx`                      | Per-role gradient propagation |
| `AuthShell` / `AuthWebShell`             | `src/views/auth/AuthShell.tsx`                      | Wraps onboarding/auth screens with theme + brand panel |

---

## 7. Phase B Deliverables Checklist (this round)
- [x] B1 — Onboarding-side audit logging (every field change written to `audit_logs`)
- [x] B2 — Encryption-at-rest for `phone`, `dob`, `postal_code` via Fernet
- [x] B3 — `GET /api/audit-logs/me` user-self audit query
- [x] B4 — `API_SPEC.md` (this file)

## 8. Deferred (future phases)
- Stream/Branch/Department dropdowns (defer per user)
- Encrypted backup-codes for 2FA
- Compliance retention policy job (90-day audit log archive)
- KMS-backed key rotation (replace static `FERNET_KEY`)
