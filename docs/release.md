# Release & CI

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `ci.yml` | PR to `main`, push to `main` | Builds an unsigned **debug** APK as a compile check. No secrets needed. |
| **Release Android** | `release-android.yml` | push of a `v*` tag (or manual) | Builds a **signed** APK + AAB and attaches them to the matching GitHub Release. |

## Cutting a release

```bash
git tag v1.2.3
git push origin v1.2.3
```

This creates a GitHub Release for the tag with auto-generated notes and attaches:

- `correctiv-app-v1.2.3.apk` — for direct install / sideloading
- `correctiv-app-v1.2.3.aab` — for upload to the Google Play Console

The tag also drives the app version: `vX.Y.Z` becomes `versionName X.Y.Z`, and the
workflow run number becomes the `versionCode` (Play requires it to increase on every
upload). `App_Resources/Android/app.gradle` is patched only inside CI — it is not
committed.

## One-time setup: signing secrets

The release workflow needs an **upload keystore** and four repository secrets.

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

Run the **Release Android** workflow manually (Actions tab → Run workflow). It builds
the signed artifacts and uploads them to the run as artifacts, without creating a
release. The signing secrets still need to be set.

## iOS (not yet wired up)

iOS requires a macOS runner plus Apple code-signing (Apple Developer Program,
distribution certificate, provisioning profile) and is distributed via TestFlight
rather than as a downloadable file. A separate workflow can be added once the Apple
Developer account is available.
