#!/usr/bin/env bash
# Walks a build on a running Android emulator and screenshots every step.
#
# The step names are the contract. They are what makes one round comparable to the
# last, so rename a step only when the screen itself changed. ACTIVITY and OUT stay
# parameters so an iOS or web tour can reuse the walk.
#
#   OUT=out/android bash tour-android.sh
set -uo pipefail
source "$(dirname "$0")/lib.sh"

quiet_system_ui
warn_if_debuggable

# A cleared app starts at the door (ADR 0016), and the onboarding, where the draft's
# tour starts, is the first thing behind it. Three shots of the door before that:
# signed out, a failed attempt, and a 0 € member the app is not part of. The
# waiting state lasts 1.5 s and is not shot; the browser check covers it.
$A shell pm clear "$PKG" >/dev/null
$A shell am start -n "$PKG/${ACTIVITY:-.MainActivity}" >/dev/null
sleep 9

# Every `expect` names the screen the step before it was supposed to reach, and is
# checked before the shot. Without them a tap that lands on nothing still produces a
# file named for a screen nobody visited, which is how `83-video` documented an empty
# state for a week and how a whole round once came back as eighteen shots of this
# onboarding. The label is one a human would read off that screen, never a tab title
# — those are on every tab and would prove nothing.
expect Anmelden;                          shot 00-gate
type_into "E-Mail-Adresse" frei@example.org
type_into "Passwort eingeben" abc; submit 3;         shot 00-gate-failed
# One more character makes the password long enough; the address keeps the 0 € tier.
type_into "Passwort eingeben" d; submit 3;           shot 00-gate-no-access
tap "Mit einem anderen Konto anmelden"
sign_in alex.beispiel@example.org geheim 5

expect "Recherchen für die Gesellschaft"; shot 01-onboarding-welcome
tap "Los geht’s"
expect "Was interessiert Sie?";           shot 02-onboarding-interests
tap Klima; tap Faktenchecks; tap Weiter
expect Benachrichtigungen;                shot 03-onboarding-push
tap Fertig; sleep 6
# The tab bar is the proof the onboarding is behind us: it does not exist above it.
expect Home;                              shot 10-home-top
scroll 2;                                 shot 11-home-mid
scroll 2;                                 shot 12-home-bottom
scroll 3;                                 shot 13-home-end
top
tap Entdecken; sleep 2
expect "Recherchen, Faktenchecks, Projekte"; shot 30-entdecken
scroll 2;                                 shot 31-entdecken-mid
tap Mediathek; sleep 3
expect "Salon5 Radio";                    shot 40-mediathek
scroll 2;                                 shot 41-mediathek-mid
tap Mitmachen; sleep 2
expect "AKTIVE AUFRUFE";                  shot 50-mitmachen
scroll 2;                                 shot 51-mitmachen-mid
tap Profil; sleep 2
expect "IHRE MITGLIEDSCHAFT";             shot 60-profil
scroll 2;                                 shot 61-profil-mid
finish
