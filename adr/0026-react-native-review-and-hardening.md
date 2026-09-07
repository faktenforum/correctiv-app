# ADR 0026 - React Native review and the next hardening steps

Status: accepted as review and follow-up direction, 2026-09-07. Implementation is
pending; tool suggestions and open product questions are not decisions to install
dependencies.

## Context

The React Native review on 2026-09-03 compared `apps/mobile` and
`packages/app-core` with React Native / Expo best practices and the team's
Expo template. The template is a second reference, not a specification this
app must copy. Its Sentry integration, FormatJS workflow, MMKV-backed persistence,
bundle analysis and store-release tooling are useful comparisons; its navigation,
styling and repository tooling serve different requirements.

Completed work and obsolete findings are excluded. This ADR's source check is
against `6d469c0`; it does not claim new device, memory, startup or accessibility
measurements.

The app already has foundations worth keeping: a platform-free core with boundary
tests, typed routes and a static web target, semantic colour tokens, React Compiler,
virtualized unbounded lists, narrow audio subscriptions, and CI assertions against
the generated Android manifest and web artifact. The missing pieces are primarily
runtime reliability, input usability, diagnostics and explicit delivery decisions.

## Decision

Use the review to guide hardening without replacing the app's architecture with
the template's stack. Make keyboard behaviour a usability requirement and
recommend Rozenite as development-only tooling. Record notifications as an
explicit dependency on a product and backend decision, rather than mistaking the
existing preference switch for an integration.

Performance recommendations remain measurement tasks until a runtime problem is
demonstrated. Absence of manual memoization, custom FlatList settings, MMKV or
Reanimated usage is not, by itself, a defect.

### 1. Recommend Rozenite for developer and agent debugging

Add [Rozenite](https://www.rozenite.dev/) to the development-tooling plan. It offers
runtime inspection for developers and a session-based CLI for agents, allowing
both to investigate the same running app rather than infer runtime state from
source or screenshots alone.

Network-request tracking is the first use case: reproduce a feed refresh or search,
record traffic, inspect status, timing and errors, and inspect request or response
bodies only when necessary. This can help distinguish a slow endpoint, a failed
request and a cache or bundled-content path that made no request at all.

Prefer Rozenite's built-in `network` domain when available. Evaluate
`@rozenite/network-activity-plugin` if that domain is unavailable or does not work
on the selected runtime, or if WebSocket/SSE inspection is needed. Do not install
every plugin by default. Agent access is session-scoped: create a session from
`apps/mobile`, reproduce the flow, inspect its requests, and stop the session when
finished.

This is a **recommendation, not an installed capability**. Its adoption must:

- Keep instrumentation and agent access development-only, out of shipped native
  builds and the public production web export.
- Compose with the existing Expo and Uniwind Metro configuration, preserving
  Uniwind's required wrapper order rather than replacing the resolver wholesale.
- Keep SDK-specific instrumentation in the host. A debugging tool is not a reason
  to import React Native or a platform SDK into `packages/app-core`.
- Use test accounts and minimise captured data. Do not retain credentials, tokens,
  personal details or unpublished reporting in traces, and do not upload captures
  to third-party services.

Confirm which traffic the integration actually sees. JavaScript HTTP inspection
does not establish visibility into WebView, native audio or video requests.
Rozenite also does not replace production crash reporting or release-build
profiling. [ADR 0025](0025-the-published-app-is-a-production-bundle.md)'s decision
to publish a production app with no dev handle remains intact.

### 2. Make inputs keyboard-aware

The reviewer observed inputs that were not keyboard-aware. The source matches
that gap: [`LoginGate.tsx`](../apps/mobile/src/components/gate/LoginGate.tsx),
[`formular.tsx`](../apps/mobile/src/app/formular.tsx), and
[`suche.tsx`](../apps/mobile/src/app/suche.tsx) set tap or dismissal behaviour on
ordinary scroll views, but do not configure keyboard avoidance or automatic
keyboard insets. The participation form's action footer is outside its scroller.

`keyboardShouldPersistTaps="handled"` lets a tap reach a control while the keyboard
is open. It does **not** keep the focused field, validation message or submit
button above that keyboard. Safe-area padding is not keyboard avoidance either.
Android window resizing may help particular screens, but does not establish
correct behaviour across both native platforms.

Use React Native's `KeyboardAvoidingView` as the default keyboard-avoidance
solution for sign-in and participation, and include search in the same pass.
If the affected layouts require more complex handling, evaluate
[React Native Keyboard Controller](https://kirillzyusko.github.io/react-native-keyboard-controller/).
It is the suggested escalation, not a dependency to add by default.
Ensure the footer and scrollable content are coordinated, avoid double-applying
insets, and preserve the web layout.

Completion means the focused field, caret, errors and next/submit controls remain
reachable with the software keyboard open on small iOS and Android screens,
including multiline input and large text. Exercise focus-next, submission,
dismissal and returning to the screen. Existing focus-next handling in sign-in
should be retained. This is a usability fix, not speculative TextInput performance
work.

### 3. Notification setup is missing; decide how notifications will be sent

The existing UI is a simulation.
[`stores/settings.ts`](../packages/app-core/src/stores/settings.ts) persists
`pushOptIn`; onboarding and settings change that boolean and label the feature
as simulated. There is no `expo-notifications` dependency or corresponding plugin
in the app configuration, and no push-token registration or notification-response
integration in the app.

The audio player's system media notification is a separate capability. It does
not provide editorial push notifications.

**Open question:** should notification setup be implemented once the team has
decided how notifications will be sent? The recommendation is to make that
decision first and implement the client and sender as one end-to-end feature.
This record chooses neither Expo Push Service nor direct APNs/FCM delivery, and
does not assume a backend or editorial tool already owns sending.

The follow-up decision needs to identify:

- Which events trigger notifications, who sends them, and which backend or
  editorial system owns targeting and delivery.
- The transport/provider, credentials ownership, delivery-error handling and
  whether the public web target is in scope.
- The consent experience, topic preferences, and the distinction between an app
  preference and actual OS permission, including denial and later revocation.
- Token registration, rotation and removal, account association and sign-out
  behaviour, with appropriate data retention.
- Foreground presentation and tap handling from background or cold start,
  including denied access, expired sessions and content that no longer exists.

After that decision, platform permission and token APIs belong in the host behind
ports where the core needs them; preference and payload policy belong in the
core. Navigation stays with the host and must respect the existing admission
gate. Until delivery is implemented, keep the simulated wording and do not treat
`pushOptIn: true` as proof of OS authorisation or successful registration.

### 4. Recommend MMKV for native persistence

Use `react-native-mmkv` instead of AsyncStorage for native settings and persisted
Redux state. Its memory-mapped storage and direct synchronous native API are
designed for low-latency reads and writes, making it a good fit for frequent access
to small values. Faster reads can also shorten startup hydration: the app restores
persisted Redux slices before showing its first screen.

Keep the integration in the host behind the existing asynchronous storage ports,
preserve web storage, and migrate existing data safely. Leave the larger
article/feed cache separate and confirm the startup benefit on-device before
rollout.

### 5. Add error tracking with a React error boundary

Add production error tracking, for example AppSignal, together with
`react-error-boundary`. Show a German recovery screen with a retry action and
forward caught errors through the boundary's `onError` callback to the reporter.

Confirm the provider's React Native / Expo support before adoption. Handle
asynchronous failures and native crashes separately, since a React error boundary
does not catch them automatically. Keep reporting in the host and redact
credentials, personal data and unpublished content.

### 6. Add commit checks with Husky

Add a Husky pre-commit hook with `lint-staged` for oxlint and oxfmt on staged files,
plus a separate `npm run typecheck`. This gives feedback before a push.

Keep the full `npm run check` in CI as the authoritative gate, since local hooks
can be bypassed. Commit checks should not require native builds.

### 7. Resolve the missing app icon

Address the missing app icon reported in the review with the final CORRECTIV
artwork for iOS and Android, including adaptive and monochrome Android variants.
Expo already references icon assets; confirm the correct artwork reaches the
installed release build and displays properly on the home screen and app launcher.

### 8. Extend FlatList use to other list screens

Use `FlatList` for `suche.tsx` and prefer it for other data-driven list screens.
Even with only 15 results, most rows are outside a phone's visible area,
especially with the keyboard open. A capped result count is not a reason to
eagerly mount every row in a `ScrollView`.

`FlatList` also makes the code cleaner: `data` and `renderItem` replace nested
maps, while `ListEmptyComponent`, `ItemSeparatorComponent`, `ListHeaderComponent`
and `ListFooterComponent` provide dedicated places for empty states, separators,
headings and loading indicators. Preserve stable item keys and keyboard tap
behaviour. This recommendation applies to search now, not only after pagination
is added.

### 9. Improve accessibility

- Make touch targets at least **44 x 44 logical units**, not physical device
  pixels; aim for **48 x 48 dp on Android**. Enlarge the pressable area or use
  `hitSlop` without overlapping neighbouring controls or exceeding parent bounds.
- Check dynamic font scaling at the largest system text sizes, including the
  reader's own text-size setting. Fix clipped labels, overlapping controls and
  fixed-height layouts; keep content reachable rather than disabling font scaling.
- Add meaningful, localized `accessibilityLabel` values where needed, especially on
  icon-only buttons. Name the action rather than the icon, expose the appropriate
  role and state, and hide decorative icons from screen readers to avoid duplicate
  announcements.

Walk the main flows with VoiceOver and TalkBack to confirm focus order, announced
labels and operable controls.

### 10. Add German and English localisation

CORRECTIV already publishes web content in English. Support German and English
in the app UI rather than keeping user-facing strings hardcoded.

- Use `expo-localization` to read the device's preferred locales.
- Use `react-intl` for translated messages, plurals, dates and numbers.
- Use FormatJS tooling to extract messages and compile translation catalogues.

Keep German as the fallback and retain formal "Sie" in German copy. Include
accessibility labels, validation and error messages in the catalogues. Locale
detection and React providers belong in the host, not the platform-free core.

UI localisation does not translate articles: English editorial content needs
appropriate source mapping and an explicit fallback when no translation exists.

### 11. Prefer navigation headers for standard screens

Use Expo Router's `Stack` header on standard detail screens instead of disabling
headers globally and drawing each back bar inside the screen. Navigation headers
provide platform-familiar back controls, title/action placement, safe-area handling
and transitions, with less custom UI code.

Configure localized titles and semantic theme colours through navigation options.
Remove redundant screen headers and top insets when enabling them. Keep custom
headers for deliberate exceptions, such as the immersive article reader, and
preserve deep-link back behaviour and the web experience.

## Consequences and order

Keyboard awareness, Android back handling and recoverable errors are the next concrete
usability/reliability work. Rozenite is the recommended diagnostic addition, not a
production dependency. The iOS build and distribution gap remains visible rather
than being inferred away from Android results.

Notification delivery stays explicitly deferred until the sender, transport and
product behaviour are decided. The error-tracking provider and tablet scope remain
named decisions instead of accidental defaults. Husky adds earlier feedback while
CI remains authoritative.
MMKV is recommended for native key/value persistence, with startup measurements
before rollout.

This costs setup and maintenance for diagnostic tooling and native delivery, and
requires device evidence where source checks cannot answer the question. It
avoids a much larger cost: importing the template wholesale or optimising a
runtime problem that has not been demonstrated.

## What this replaces

This record supersedes [ADR 0012](0012-a-list-virtualizer-for-the-unbounded-lists.md)'s
decision that "Every other list stays a mapped ScrollView" for `suche.tsx`.
The search result cap remains unchanged; cleaner list code and off-screen rows
justify the recommendation without waiting for more results. Other bounded
screens remain candidates for review, not a blanket conversion.

The corresponding statement is marked in ADR 0012. Its original reasoning is
preserved, and the search migration is still pending.
