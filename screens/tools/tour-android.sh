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

# A cleared app starts at the door (ADR 0016), and the onboarding, where the draft's
# tour starts, is the first thing behind it. Three shots of the door before that:
# signed out, a failed attempt, and a 0 € member the app is not part of. The
# waiting state lasts 1.5 s and is not shot; the browser check covers it.
$A shell pm clear "$PKG" >/dev/null
$A shell am start -n "$PKG/${ACTIVITY:-.MainActivity}" >/dev/null
sleep 9

shot 00-gate
type_into "E-Mail-Adresse" frei@example.org
type_into "Passwort eingeben" abc; submit 3;         shot 00-gate-failed
# One more character makes the password long enough; the address keeps the 0 € tier.
type_into "Passwort eingeben" d; submit 3;           shot 00-gate-no-access
tap "Mit einem anderen Konto anmelden"
sign_in alex.beispiel@example.org geheim 5

shot 01-onboarding-welcome
tap "Los geht’s";                         shot 02-onboarding-interests
tap Klima; tap Faktenchecks; tap Weiter;  shot 03-onboarding-push
tap Fertig; sleep 6;                      shot 10-home-top
scroll 2;                                 shot 11-home-mid
scroll 2;                                 shot 12-home-bottom
scroll 3;                                 shot 13-home-end
top
tap Entdecken; sleep 2;                   shot 30-entdecken
scroll 2;                                 shot 31-entdecken-mid
tap Mediathek; sleep 3;                   shot 40-mediathek
scroll 2;                                 shot 41-mediathek-mid
tap Mitmachen; sleep 2;                   shot 50-mitmachen
scroll 2;                                 shot 51-mitmachen-mid
tap Profil; sleep 2;                      shot 60-profil
scroll 2;                                 shot 61-profil-mid
echo done
