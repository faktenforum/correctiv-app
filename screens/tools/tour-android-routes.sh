#!/usr/bin/env bash
# Second pass, for the pushed routes. These are reached by deep link rather than by
# tapping, which covers the screens no tab leads to.
#
#   OUT=out/android bash tour-android-routes.sh
set -uo pipefail
source "$(dirname "$0")/lib.sh"

# Every deep link lands on the door while nobody is signed in. Run after
# tour-android.sh, whose sign-in persists; this covers running it alone.
$A shell am start -n "$PKG/${ACTIVITY:-.MainActivity}" >/dev/null
sleep 6
ensure_signed_in

# A real article URL, read off the live feed. An invented one 404s, and the shot then
# documents the reader's error state instead of the reader.
ARTICLE='https://correctiv.org/faktencheck/2026/08/04/video-zeigt-feiernde-fussballfans-keine-menschen-in-ceuta/'
open_route "artikel?url=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$ARTICLE")" 9
shot 22-reader
scroll 3; shot 23-reader-mid

# The player is only worth a screenshot with something playing. The club's bonus
# episode is bundled audio, so it plays without a network — unlike the radio, whose
# host this emulator image does not trust (the YR-chain row in the README).
#
# It sits on MEDIATHEK, under "Aus dem Backstage" — not on the backstage route,
# which lists the diary. Aimed at the backstage route this step reported MISS and
# the tour walked on, so 82-player was a blank screen that nobody looked at. The
# label is the play control's, hence the trailing "abspielen".
open_route mediathek 5
scroll 2
tap "Bonusfolge: Wie wir an die Pensionskassen-Daten kamen abspielen" && sleep 4
open_route player 4;        shot 82-player

# The video screen takes its video from the core store, not from a path parameter,
# so a bare `correctiv://video` has nothing to show: that step documented the
# "Kein Video ausgewählt." empty state for a week. Tap one instead.
open_route mediathek 4
scroll 1
tap "Demokratie oder Doomsday" && sleep 8
shot 83-video
open_route backstage 4;     shot 90-backstage
open_route beitreten 4;     shot 70-join-1
open_route einstellungen 4; shot 91-einstellungen
open_route gespeichert 3;   shot 92-gespeichert
open_route faktenforum 5;   shot 93-faktenforum
open_route atlas 5;         shot 94-atlas
open_route suche 3;         shot 95-suche
open_route bericht 3;       shot 96-bericht
open_route spotlight 3;     shot 97-spotlight
echo done
