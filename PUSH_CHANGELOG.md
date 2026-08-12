# Push Changelog — Aug 10, 2026 (dev-fixes)

**Branch:** `dev-fixes`
**Summary:** Performance fix + security credential scrub + full codebase cleanup (963 files changed, ~185K lines removed)

---

## Performance Fixes

| File | What changed |
|---|---|
| `frontend/app/_layout.tsx` | App no longer blocks first paint on 15 web fonts. Gate changed to `(Platform.OS !== 'web' && !fontsLoaded && !fontError) \|\| !initialized` — web renders immediately with system-font FOUT; native still waits on fast local fonts. |
| `frontend/app/index.tsx` | Removed artificial 1.4s (web) / 2s (native) splash `setTimeout`. Routing fires immediately once auth state resolves. |

## Security Fixes

Removed hardcoded production **MongoDB Atlas URI** and **JWT secret** from source — both are now required from `.env` (fails fast with a clear message if missing).

| File | Removed credential |
|---|---|
| `backend/server.py` | Atlas URI (line 125) + JWT secret fallback (line 130) |
| `backend/core/db.py` | Atlas URI fallback (line 21) |
| `backend/core/security.py` | JWT secret fallback (line 41) |
| `backend/echo_showcase.py` | JWT secret fallback (×4 occurrences) |
| `backend/newsletter.py` | JWT secret fallback (line 57) |
| `backend/check_4_accounts.py` | Atlas URI (line 5) — then deleted |
| `backend/find_student.py` | Atlas URI (line 8) — then deleted |
| `backend/migrate_to_atlas.py` | Atlas URI fallback (line 23) — then deleted |
| `backend/run_full_portal_regression.py` | Atlas URI (line 8) — then deleted |

⚠️ **ACTION REQUIRED:** Rotate the actual Atlas password and JWT_SECRET at the source (Atlas console / deploy env). The old values were in git history.

## Files Deleted

### Root — 49 one-off Python scripts (all unreferenced)

```
capture_auth.py          change_shield_color.py    change_shield_color_dark.py
change_shield_color_indigo.py  check_ai_settings.py  check_db.py
check_db2.py             check_frontend.py         check_metrics.py
debug_flow.py            debug_login.py            find_missing_image.py
find_roadmap.py          fix_all_white_colors.py   fix_alumni_sidebar_shadow.py
fix_atoms_muted.py       fix_college_onboard_text.py  fix_kpi_cards.py
fix_kpi_icons.py         fix_onboarding_colors.py  fix_onboarding_colors_2.py
fix_option_list_card.py  fix_option_list_card_2.py fix_platform_import.py
fix_users_photo.py       fix_web_controls_colors.py  generate_docs.py
generate_rag_docs.py     generate_rag_text_docs.py patch_all_sidebars.py
reindex_rag.py           remove_sidebar_shadow.py  scratch_verify.py
seed_network.py          test_chat.py              test_collection.py
test_cors.py             test_cors2.py             test_db.py
test_debug.py            test_debug2.py            test_direct_qdrant.py
test_local.py            test_prompt.py            test_retrieval.py
test_script.py           test_stream.py            use_glass_logo.py
wait_frontend.py
```

### Backend — 44 one-off scripts deleted (all unreferenced by server.py, CI, or Docker)

```
api_deep_audit.py        api_verify.py             career_ai_acceptance_test.py
check_4_accounts.py      check_counts.py           check_creds.py
check_db.py              check_db_details.py       check_first_9.py
check_gmail.py           check_mentor.py           check_mentor_sessions.py
check_priya.py           check_remaining.py        check_user.py
cleanup_legacy.py        delete_test_accounts.py   discover_api.py
dump_errors.py           e2e_9accounts_test.py     ensure_indexes.py
export_seed_data.py      find_student.py           fix_qr_codes.py
fix_test.py              generate_test_account_list.py  list_users.py
migrate_to_atlas.py      preflight.py              qa_e2e_audit.py
reindex.py               run_acceptance_test.py    run_dump.py
run_full_portal_regression.py  run_phase7_e2e_audit.py  setup_test_student.py
test_ai.py               test_atlas.py             test_atlas2.py
test_conn.py             test_db.py                test_discover.py
test_email.py            test_regex.py
```

### Backend — 6 seed scripts moved to `backend/scripts/` (preserved)

```
seed_mock_data.py        seed_personas.py          seed_portals.py
seed_real_datasets.py    seed_realistic.py         seed_reviews_script.py
```

### Frontend — 22 orphan files deleted (all verified zero references)

```
src/lib/skillMeta.ts
src/lib/useTrackPageView.ts
src/utils/eventHelpers.ts
src/utils/__tests__/eventHelpers.test.ts
src/utils/pinCode.ts
src/views/screens/MentorHome.tsx
src/views/web/LandingPageFinTax360.tsx
src/views/web/admin/PlaceholderPage.tsx
src/views/web/nexus-glow-landing/AgentKCompanion.tsx
src/views/web/portals/alumni/brand.ts
src/views/web/portals/mentor/brand.ts
src/views/web/portals/college/brand.ts
src/views/web/portals/student/views/WalletView.tsx
src/views/web/portals/alumni/views/WalletView.tsx
src/views/web/portals/mentor/StubView.tsx
src/views/web/portals/alumni/views/StubView.tsx  ← consolidated, see below
src/views/web/portals/student/views/ProfileView.tsx
src/views/web/portals/alumni/views/ProfileView.tsx
src/views/web/portals/student/data.ts            ← kept; alumni redirected
src/views/web/portals/alumni/data.ts             ← deleted; alumni redirected
src/views/web/roleData.tsx
src/motion/apple/composites.tsx
```

### Dead assets deleted

| File | Size | Why dead |
|---|---|---|
| `frontend/public/bg-fluid.png` | 677 KB | Zero references |
| `frontend/public/stars-bg.jpg` | 328 KB | Zero references |
| `frontend/public/agent-k-hero.png` | 245 KB | Zero references |
| `frontend/public/vj-data-questers.png` | 0 B | Corrupt empty file |

### Root stray files deleted from disk

```
git_log.txt (19 MB)     frontend_lint_results.txt   backend_test_results.txt
frontend_test_results.txt  test_commits.txt          portal_regression_results.json
backend/out.txt          backend/working_accounts.json  backend/body_text.txt
backend/api_audit_results.json  backend/phase7_e2e_results.json
backend/portal_regression_results.json  stars-bg.jpg (root duplicate)
```

## Git Hygiene — Untracked (git rm --cached)

These were committed before .gitignore existed. Removed from tracking but remain on disk:

| Path | Size | Files |
|---|---|---|
| `QA-Automation/allure-results/` | ~59 MB | 611 |
| `QA-Automation/reports/` | ~2.7 MB | 34 |
| `node-local/` | 66 MB | 12 |
| `frontend/yarn-local/` | 5.1 MB | — |
| `tests/artifacts/` | 8.4 MB | 93 |
| `backend/acceptance_screenshots/` | 4.2 MB | — |
| `backend/e2e_report/` | 3.8 MB | — |
| `backend/qa_audit_report/` | 4.9 MB | — |
| `backend/phase7_e2e_screenshots/` | 1.8 MB | — |
| `.DS_Store` (×3) | — | 3 |
| `qa_testing/` (empty stub) | — | 2 |

**Total:** ~792 files untracked from index.

## Code Consolidation

| What | Before | After |
|---|---|---|
| Alumni `StubView.tsx` | `alumni/views/StubView.tsx` (identical copy of student's) | Deleted; `AlumniPortalRN.tsx` imports from `../student/views/StubView` |
| Alumni `data.ts` | `alumni/data.ts` (identical copy of student's) | Deleted; `alumni/Sidebar.tsx` and `alumni/TopBar.tsx` import from `../student/data` |
| Alumni portal imports | Mix of local + cross-imports | All shared views now import from `../student/views/` (consistent pattern) |

## .gitignore Additions

Added entries for test artifacts, result dumps, and vendored runtimes to prevent re-committing:

```
QA-Automation/allure-results/
QA-Automation/reports/
tests/artifacts/
backend/acceptance_screenshots/
backend/e2e_report/
backend/qa_audit_report/
backend/phase7_e2e_screenshots/
git_log.txt
frontend_lint_results.txt
backend_test_results.txt
frontend_test_results.txt
test_commits.txt
portal_regression_results.json
backend/out.txt
backend/working_accounts.json
backend/body_text.txt
backend/api_audit_results.json
backend/phase7_e2e_results.json
backend/portal_regression_results.json
backend/cryptography.whl
```

## Recovery

If you need to recover any deleted file, it's still in git history:
```bash
git show HEAD~1:<path>       # view file content
git checkout HEAD~1 -- <path>  # restore file
```

For untracked bloat (allure-results, node-local, etc.), the files are still on disk — just no longer tracked by git.
