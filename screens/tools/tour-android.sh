#!/usr/bin/env bash
# Walks a build on a running Android emulator and screenshots every step.
#
# The step names are the contract: they match screens/draft/ and screens/nativescript/
# so the three sets can be read side by side. ACTIVITY and OUT are parameters because
# this script was written to walk two different builds the same way.
#
#   OUT=out/expo bash tour-android.sh
set -uo pipefail
source "$(dirname "$0")/lib.sh"

# A cleared app starts at onboarding, which is where the draft's tour starts too.
$A shell pm clear "$PKG" >/dev/null
$A shell am start -n "$PKG/${ACTIVITY:-.MainActivity}" >/dev/null
sleep 9

shot 01-onboarding-welcome
tap "Los geht’s";                         shot 02-onboarding-interests
tap Klima; tap Faktenchecks; tap Weiter;  shot 03-onboarding-push
tap Weiter; sleep 2;                      shot 04-onboarding-club
tap "Erstmal umsehen"; sleep 6;           shot 10-home-top
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
