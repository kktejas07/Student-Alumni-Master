# 🤖 CI / Automation

## `release.yml` — Auto-tag + Auto-release from `CHANGELOG.md`

Every push to `main` that touches `CHANGELOG.md`:

1. Parses the **newest `## [x.y.z]` section** in the changelog.
2. If `vX.Y.Z` doesn't exist as a git tag yet → **creates the tag**.
3. **Publishes a GitHub Release** using that section's markdown as the
   release notes body.

The workflow is **idempotent** — pushing the same CHANGELOG twice
never produces duplicate tags or releases.

### How it integrates with Emergent's "Save to GitHub"

```
┌──────────────────────────┐      ┌──────────────────────────────┐
│ Emergent "Save to GitHub"│ ───▶ │ commit pushed to main         │
└──────────────────────────┘      │ (CHANGELOG.md was bumped)     │
                                  └─────────────┬─────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │ release.yml workflow runs    │
                                  │  • reads latest x.y.z        │
                                  │  • creates tag vX.Y.Z        │
                                  │  • creates GitHub Release    │
                                  └──────────────────────────────┘
```

So after the very first run, your flow is just:

1. We bump the version + add a `## [x.y.z]` section to `CHANGELOG.md`
   here in the assistant.
2. You click **Save to GitHub** in Emergent.
3. Tags + GitHub Releases appear automatically — no local cloning.

### First-time setup — backfill existing versions

The first time you push this workflow, the changelog already contains
**v0.7.0 → v0.12.0** but no tags exist yet. Run the workflow once in
**backfill mode** to retroactively tag + release all of them:

1. GitHub repo → **Actions** tab.
2. Pick **"Release on CHANGELOG bump"** in the left sidebar.
3. Click **Run workflow** (top-right dropdown).
4. Toggle **`backfill`** to `true`.
5. Click **Run workflow**.

You'll see 6 fresh tags and 6 fresh releases appear within ~30 s.

After that, leave `backfill` off — every future CHANGELOG bump
auto-creates exactly one new tag + release.

### Local sanity check

You can run the extractor locally to preview what the workflow will do:

```bash
chmod +x scripts/extract-changelog.sh

scripts/extract-changelog.sh --version          # → 0.12.0
scripts/extract-changelog.sh --tag              # → v0.12.0
scripts/extract-changelog.sh --list-versions    # → all semver entries, newest→oldest
scripts/extract-changelog.sh --body             # → markdown body of latest
scripts/extract-changelog.sh --body-for 0.10.0  # → markdown body of a specific version
```

### Required repo settings

No PATs or extra secrets required — the workflow runs with the default
`GITHUB_TOKEN` (which has `contents: write` thanks to the `permissions`
block in the workflow file).

If your org enforces stricter token policies, ensure:
- **Settings → Actions → General → Workflow permissions** is set to
  **"Read and write permissions"**.
- **Settings → Actions → General → "Allow GitHub Actions to create
  and approve pull requests"** is not required for this workflow but
  doesn't hurt to enable.
