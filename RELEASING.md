# Releasing skeleton-crew

This project publishes to npm as [`skeleton-crew`](https://www.npmjs.com/package/skeleton-crew).
One script — `scripts/release.js` — drives the whole release. You run it from a
clean `main`; it bumps the version, writes the changelog, tests, builds, commits,
tags, **publishes**, and pushes.

## TL;DR

```bash
# 1. Rehearse — prints every step, changes nothing, but really runs test + build:
npm run release:dry -- 0.7.1

# 2. Do it for real (interactive: pauses twice for your confirmation):
npm run release -- 0.7.1
```

That's it. The `--` is required so npm forwards the version to the script.

## What the script does (in order)

```
validate → bump package.json → sync README → generate CHANGELOG entry
  → [confirm] → npm test → npm run build → git commit + tag
  → npm publish → [confirm] → git push (main + tag)
```

1. **Validate** — must be on `main` with a clean tree, and the target version must be
   strictly greater than what's already on npm (catches re-publishing or going backwards).
2. **Bump** `package.json` to the target version.
3. **Sync README** — only if it still contains the old version string (it usually doesn't;
   release notes live in the changelog).
4. **Generate CHANGELOG entry** from commit subjects since the last tag, bucketed into
   Added / Fixed / Changed / Documentation. **This is a draft** — open `CHANGELOG.md`
   at the review pause and rewrite the bullets into real notes.
5. **Review pause** (interactive only) — your chance to edit the changelog before anything
   irreversible happens.
6. **Test + build** — `npm test` then `npm run build`. A failure here aborts before publish.
7. **Commit + tag** — `chore(release): x.y.z` and tag `vx.y.z`.
8. **Publish** — `npm publish --access public`. This is the irreversible step.
9. **Push** (interactive only: second confirmation) — `git push origin main` and the tag.

### Why publish runs *before* push

If `npm publish` fails (auth, registry, a 2FA timeout), nothing has been pushed to
origin yet — you just reset the local commit and tag and try again:

```bash
git tag -d v0.7.1
git reset --hard HEAD~1
```

So a pushed tag always corresponds to a version that genuinely made it onto npm. The
script also re-reads the registry after publishing and **refuses to push** if npm isn't
serving the expected version.

## Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Print every step; write/commit/publish/push nothing. (Still runs test + build.) Implies `--yes`. |
| `--yes`, `-y` | Non-interactive: skip both confirmation prompts. For CI. |
| `--otp=123456` | Pass a 6–8 digit one-time password to `npm publish` (accounts with npm 2FA). |
| `--no-publish` | Run everything except `npm publish` (e.g. to tag + push, then publish by hand). |
| `--help`, `-h` | Usage. |

```bash
# Unattended (no npm 2FA on the account / token):
npm run release -- 0.7.1 --yes

# Unattended with 2FA:
npm run release -- 0.7.1 --yes --otp=123456
```

## Prerequisites

- **npm auth.** `npm whoami` must print the publishing account (a package owner). If not,
  `npm login`.
- **2FA.** If the account requires a one-time password to publish, an unattended run
  (`--yes`) needs `--otp=`. Without it, `npm publish` will hang waiting for the prompt —
  prefer an interactive run, or use an automation token that doesn't require an OTP.
- **Clean `main`.** Commit or stash everything first; the script refuses a dirty tree.

## Versioning

[Semantic Versioning](https://semver.org/). Roughly:

- **patch** (`0.7.0 → 0.7.1`) — bug fixes, no API change.
- **minor** (`0.7.0 → 0.8.0`) — additive, backward-compatible features (e.g. action contracts shipped as 0.7.0).
- **major** — only after 1.0.0, for breaking changes. Pre-1.0, breaking changes go in a minor bump but **must** be called out in the changelog.

## What gets published

`package.json#files` controls the tarball — currently `dist/`, `LICENSE`, `README.md`.
Source, tests, examples, and docs are **not** shipped. To preview the exact tarball
without publishing:

```bash
npm publish --dry-run     # lists every file + size
npm pack                  # writes skeleton-crew-x.y.z.tgz locally to inspect
```

## After releasing — smoke test

Confirm the published package resolves its public surface from a clean install:

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null && npm install skeleton-crew@latest
node --input-type=module -e "import { Runtime } from 'skeleton-crew'; console.log(typeof Runtime)"  # → function
```

## If something goes wrong

- **Published a broken version.** npm disallows re-publishing the same version. Bump to the
  next patch, fix, and release again. (`npm unpublish` is heavily restricted and disruptive —
  avoid it; ship a fix forward instead.)
- **Tag pushed but publish failed.** Shouldn't happen (publish gates the push), but if it
  does: `git push origin :refs/tags/vx.y.z` to delete the remote tag, then retry.
- **Wrong changelog after pushing.** Just commit a docs fix; the changelog isn't in the
  npm tarball, so no re-release is needed.
