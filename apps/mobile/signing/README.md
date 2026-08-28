# Signing keys

## `correctiv-test.keystore`, a throwaway TEST key (committed on purpose)

This keystore is intentionally committed and has **no security value**. It exists
so the Release workflow can produce an *installable* APK with a **stable signature**
when no real signing secrets are configured. Handy for sharing test builds
that testers can update in place (same signature = no uninstall needed).

- store password / key password: `correctiv-test`
- key alias: `correctiv-test`

**Never use this key for the Google Play Store or any production release.** For real
releases, set the `ANDROID_KEYSTORE_*` repository secrets (see `../../../RELEASE.md`);
the workflow then signs with your real upload key instead and also builds the AAB.

Regenerate (if ever needed), from the repository root:

```bash
keytool -genkeypair -v \
  -keystore apps/mobile/signing/correctiv-test.keystore \
  -alias correctiv-test -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass correctiv-test -keypass correctiv-test \
  -dname "CN=CORRECTIV App TEST KEY (not for Play), O=CORRECTIV, C=DE"
```
