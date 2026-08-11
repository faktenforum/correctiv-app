# Release & CI

Three GitHub Actions workflows live in `.github/workflows/`:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `ci.yml` | every PR, push to `main` | Checks, web export, and an Android APK for **each** app as a compile check. No secrets needed. |
| **Pages** | `pages.yml` | push to `main` (or manual) | Rebuilds the Expo web export under the Pages base path and publishes it to <https://faktenforum.github.io/correctiv-app/>. No secrets needed. |
| **Release Android** | `release-android.yml` | push of a `v*` tag (or manual) | Builds **one APK per app**, signs both with the same key — your upload key when the secrets are set (plus a Play-ready AAB for the NativeScript app), otherwise the bundled **test key**. Attaches everything to the GitHub Release. |

## The web preview

A web version of the app at <https://faktenforum.github.io/correctiv-app/>, for
clicking through without an install. Every push to `main` republishes it; there is
nothing to tag and nothing to commit. Two things are worth knowing before pointing
anyone at the URL:

- **Its articles are as old as the last `npm run offline-articles`.** The browser
  cannot reach any CORRECTIV feed — no CORS header — so the app falls back to the
  snapshot bundled into the build, and says so on screen. Re-run the generator and
  merge it before a demo.
- **The site is a project site**, served from `/correctiv-app/`, so the export needs
  `EXPO_BASE_URL` to prefix its asset URLs. `pages.yml` takes that value from
  `actions/configure-pages` and asserts it reached the built HTML — the failure is
  otherwise invisible until the site is live and blank.

Pages was previously served straight off `main:/docs`. Pointing it at this workflow
instead is a **repository setting**, made once and not by the workflow itself —
`actions/configure-pages` reads an existing site but never changes its build type:

```bash
gh api -X POST repos/faktenforum/correctiv-app/pages -f build_type=workflow
# or: Settings → Pages → Build and deployment → Source: GitHub Actions
```

Until that is done, the deploy step fails with *"Not configured to use GitHub
Actions"* — the build and every assertion above it still run, so the failure is
loud and specific rather than a silently stale site.

## Cutting a release

```bash
git tag v1.2.3
git push origin v1.2.3
```

This creates a GitHub Release for the tag with auto-generated notes and attaches:

- `correctiv-app-expo-v1.2.3.apk` — the app going forward
- `correctiv-app-nativescript-v1.2.3.apk` — the app it replaces
- `correctiv-app-nativescript-v1.2.3.aab` — for the Google Play Console (real key only)

**Both apps ship** while both are maintained ([ADR 0006](adr/0006-one-core-two-hosts.md)),
and they declare the same package id `org.correctiv.app.prototype` — so only one can
be installed on a device at a time. The asset names are the only thing telling them
apart; installing the second one replaces the first.

The tag also drives the app version: `vX.Y.Z` becomes `versionName X.Y.Z`, and the
workflow run number becomes the `versionCode` (Play requires it to increase on every
upload). `App_Resources/Android/app.gradle` and `apps/mobile-rn/app.json` are patched
only inside CI — neither change is committed.

Both APKs are signed with the **same** key. Gradle signs the Expo release variant
with the Expo template's debug key, so the workflow re-signs it with `apksigner`
afterwards — otherwise one release would carry two APKs under two identities.

## Signing modes

The release build works **with or without** your own signing key:

| | Secrets set? | Output | Use |
| --- | --- | --- | --- |
| **Real release** | yes | APK **+ AAB**, signed with your upload key | Google Play + sideloading |
| **Test fallback** | no | APK only, signed with the in-repo **test key** (`signing/`) | Sideloading / sharing prototype builds |

The test fallback needs no setup — every `v*` tag (or manual run) produces an
installable, consistently-signed test APK (clearly marked as a test build). It must
never go to the Play Store. To produce real releases, add the secrets below.

## Switching to real (Play Store) releases

For Play-ready releases, set up your own **upload keystore** and four repository
secrets. Without them the workflow falls back to the test key described above.

### 1. Create an upload keystore (if you don't have one yet)

```bash
keytool -genkeypair -v \
  -keystore correctiv-upload.jks \
  -alias correctiv-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Keep this file and its passwords safe — losing it means you can no longer update the
app on Google Play. Do **not** commit it.

### 2. Add the secrets

Replace the values, then run (requires the GitHub CLI, `gh auth login`):

```bash
base64 -w0 correctiv-upload.jks > keystore.b64

gh secret set ANDROID_KEYSTORE_BASE64   < keystore.b64
gh secret set ANDROID_KEYSTORE_PASSWORD --body 'your-keystore-password'
gh secret set ANDROID_KEY_ALIAS         --body 'correctiv-upload'
gh secret set ANDROID_KEY_PASSWORD      --body 'your-key-password'

rm keystore.b64
```

(Or add them via GitHub → Settings → Secrets and variables → Actions.)

## Testing the pipeline without a release

Run the **Release Android** workflow manually (Actions tab → Run workflow, or
`gh workflow run release-android.yml`). It builds both APKs and uploads them to the run
as artifacts, without creating a release. No secrets required — it uses the test key.

Done once on 2026-08-06 from `9842b27`
([run 31105467974](https://github.com/faktenforum/correctiv-app/actions/runs/31105467974)),
before anyone relies on a real tag. What it proved:

- Both jobs green; both artifacts on the run, named `correctiv-app-{expo,nativescript}-main.apk`
  (on a manual run `GITHUB_REF_NAME` is the branch, not a version — see the gap below).
- **Both APKs carry the same certificate**, which is the one claim worth checking here:
  SHA-256 `f3ee1b52…`, `CN=CORRECTIV App TEST KEY (not for Play)`. The re-signing step
  works. Both verify under signature scheme v2 (the Expo one additionally v3), so both
  install on everything the app supports (`minSdkVersion 24`).
- The test-key fallback was taken, since no `ANDROID_KEYSTORE_*` secrets are set: a
  workflow warning, an APK and **no AAB** — as intended.
- The attach job was correctly **skipped** without a tag.
- The NativeScript APK installs and runs: it is the build `screens/nativescript/` was
  shot from, so the artifact is known-good, not merely present.

**What a tagless run cannot cover**, because both steps are `if:` a tag — the two
`Set version from tag` steps and the attach job. The version steps were checked
separately by running them verbatim against the real files with `GITHUB_REF_NAME=v1.2.3`
and `GITHUB_RUN_NUMBER=47`: `app.gradle` went to `versionCode 47` / `versionName "1.2.3"`
(both `sed` patterns match — a `sed` that matches nothing changes nothing and says so
nowhere), and `app.json` to `version 1.2.3` with `android.versionCode 47`, keeping
`package`, the adaptive icon and the permissions. Attaching to a release stays unproven
until the first real tag.

One cosmetic thing: `apksigner` writes a v4 `.apk.idsig` next to the Expo APK, so it
rides along in the run artifact. It cannot reach a GitHub Release — that step globs
`*.apk` and `*.aab`.

## iOS (not yet wired up)

iOS requires a macOS runner plus Apple code-signing (Apple Developer Program,
distribution certificate, provisioning profile) and is distributed via TestFlight
rather than as a downloadable file. A separate workflow can be added once the Apple
Developer account is available.
