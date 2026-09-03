# ADR 0020 — No contribution in the app, and one link out

Status: accepted, 2026-09-03. Answers the question [ADR 0016](0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md)
opened and [ADR 0019](0019-identity-lives-in-the-session.md) left standing. Half of it.
The other half is named at the end and is not ours to answer.

## Context

CORRECTIV's requirements were reformulated at the end of August 2026. One line in WP2
decides this:

> Die App bietet keine Zahlungsfunktionen und sollte als Reader-App oder Companion-App
> registriert werden, um die Zahlung von App-Store-Gebühren zu vermeiden.

Until now the app set a contribution. `apps/mobile/src/app/beitreten.tsx` offered six
amounts, monthly or yearly, with two perks lighting up above 15 € and 30 €. The profile
carried "Beitrag festlegen", "Beitrag ändern", "Pausieren" and "Fortsetzen", and
`stores/membership.ts` held `amountEur`, `interval` and `paused` behind them.

**None of that broke a store rule, and that is worth stating plainly, because the first
draft of this decision claimed it did.** Apple's 3.1.1 requires In-App Purchase for
unlocking real content; a simulation unlocks nothing and charges nobody. What the flow
was, is the wrong template: it is the journey in the design workshop, the one the agency
builds from, and the one the web export publishes on every push to `main`.

Two further things were checked before this was written, because both had been asserted
without measurement:

| Claim | Verdict |
| --- | --- |
| "Naming prices and tiers in the app disqualifies it as a reader app" | **Not as stated.** 3.1.3(a) lets a reader app show content bought elsewhere and lets people manage an account. The rule that bites is the introduction to 3.1.3, which forbids encouraging any payment method other than IAP, and the External Link Account Entitlement, which forbids **price language in the link itself**. So the constraint lands on the wording, not on the existence of a screen. |
| "Browser-based OIDC is what Apple and Google want at a login" | **Unsupported, and not this decision's business.** RFC 8252 is an IETF recommendation. Apple's 4.8 governs third-party logins and exempts an app's own account system. The sign-in shape is left to a later ADR. |

## Decision

**The app sets no contribution. The profile reads what the membership system answered
and offers one link out.**

- `apps/mobile/src/app/beitreten.tsx` is deleted, with its route in
  `apps/mobile/src/app/_layout.tsx`, `tools/preview/src/routes.ts` and the
  `70-join-1` step in `screens/tools/tour-android-routes.sh`.
- **`packages/app-core/src/stores/membership.ts` is deleted entirely.** With the
  contribution gone, `memberSince` was its last field, and a slice with one field and
  no writer is the defect this repo already has one of: `entitlement.localAreas`, set
  by the simulation and read by nothing.
- `memberSince` moves onto `Entitlement`, where the rest of the membership system's
  answer already lives. ADR 0019 refused this move and named the condition that would
  make it right: "the moment the contribution is a server answer rather than a local
  simulation". A join date always was one. It is `SIMULATED_MEMBER_SINCE` in
  `services/auth.service.ts` until beabee answers, fixed rather than read off the
  clock, because `refreshEntitlement` can build an entitlement twice and a date from
  `now` would make the membership younger while the app was open.
- The profile's membership card becomes four read-only rows, of which two are
  conditional: tier, why the app is open, an end date for a trial, the local
  newsletters. Below them one button, **"Konto verwalten"**, opening the system
  browser.

### The label is the part with a rule behind it

Outside the US, a link from the app to CORRECTIV's own site needs the External Link
Account Entitlement, whose conditions are: content is the app's primary functionality,
the link opens the system browser and never a webview, it is declared statically in
`Info.plist`, the app offers no In-App Purchase beside it, and **the link does not name
a price**. Apple's own permitted example is "go to example.com to create or manage your
account".

So the button says "Konto verwalten" and never "Beitrag erhöhen". The line under it
names what lives on the other side without pricing it. `ACCOUNT_URL` in
`apps/mobile/src/app/(tabs)/profil.tsx` is a constant of its own, separate from the
door's `LINKS.upgrade`, because the door addresses somebody with no access and the
profile addresses a member: same address today, different rules, and they must be able
to move apart.

## What this does not decide

- **Where the link goes.** beabee will own the account page and does not have one yet,
  so the constant points at `correctiv.org/unterstuetzen/`, which is a donation page
  and therefore exactly the wording risk above. The requirements themselves leave this
  open, twice: "link to beabee in external browser? need to clarify with app store
  settings".
- **The door's own three labels**, which this decision deliberately did not touch:
  "Mitgliedschaft erweitern", "Beitrag festlegen" (a lapsed trial) and "Mitglied mit
  Beitrag werden", all in `apps/mobile/src/components/gate/LoginGate.tsx`. They point
  at the same page as "Konto verwalten" and they are the riskier wording under the
  same rule, because they direct somebody towards a purchase rather than towards an
  account. They are also the copy of the screen this repo argued over most recently
  ([ADR 0016](0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md)), the
  audience is somebody the app does not work for at all, and rewriting user-facing
  German here is a decision for KomFun. Named rather than quietly left: after this
  ADR the profile and the door say different things about the same link, and that is
  a state to resolve, not to keep.
- **Whether the app is a reader app at all.** 3.1.3(a) wants content as the primary
  functionality. This app also has Mitmachen, a CrowdNewsroom, events and, later,
  quizzes. Apple's counter-example is a social network with video. That is a review
  outcome, not a repo decision.
- Apple's reader-app page announces a change for the EU from 2026-10-01, four weeks
  after this. Whoever finalises the journey should read it then.

## What this retires

- In [ADR 0016](0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md), under
  "What this leaves open": "whether the join flow stays in the app or becomes a link
  out". Struck there, with a pointer here. The clause beside it, "and the store rules
  on external purchases", stays open and is narrowed above.
- In [ADR 0019](0019-identity-lives-in-the-session.md): the whole of "What this does
  not decide", both paragraphs. The first is decided here; the second named the
  condition under which `memberSince` could move, and that condition is met.
- In [ADR 0019](0019-identity-lives-in-the-session.md): "`MembershipState` is
  `memberSince`, `amountEur`, `interval`, `paused`", "`join(amountEur, interval)` no
  longer takes a name", "The profile prints an amount only when somebody set one", the
  `signOut` extraReducer and "Two steps remain, the amount and the confirmation". All
  describe a slice and a screen that no longer exist. The reasoning around them is
  untouched, because it is why this decision could be taken cleanly: the contribution
  had already been cut away from identity, so removing it moved one file and no
  concepts.
