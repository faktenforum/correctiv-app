# Release & CI

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `ci.yml` | PR to `main`, push to `main` | Builds an unsigned **debug** APK as a compile check. No secrets needed. |
| **Release Android** | `release-android.yml` | push of a `v*` tag (or manual) | Signs with your upload key (**APK + AAB**, Play-ready) when secrets are set, otherwise with the bundled **test key** (**APK only**). Attaches the result to the GitHub Release. |

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
`gh workflow run release-android.yml`). It builds the APK and uploads it to the run as
an artifact, without creating a release. No secrets required — it uses the test key.

## iOS (not yet wired up)

iOS requires a macOS runner plus Apple code-signing (Apple Developer Program,
distribution certificate, provisioning profile) and is distributed via TestFlight
rather than as a downloadable file. A separate workflow can be added once the Apple
Developer account is available.
