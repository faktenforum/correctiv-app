# docs/ is generated — do not hand-edit

This directory is the **GitHub Pages output** (live at
<https://faktenforum.github.io/correctiv-app/>). Everything here except this file is
copied in by `scripts/deploy-demo.sh` from the sibling repo `design-entwurf/project`
and will be overwritten on the next deploy. It is the original design draft as an
HTML/React mockup — the same demo journey in any browser, no build — and it is about
to stop being the thing at that URL, because `apps/mobile-rn` now produces a real web
build of the actual app.

Hand-written documentation therefore lives **outside** this directory:

| What | Where |
| --- | --- |
| Project overview and quickstart | [`README.md`](../README.md) |
| How it fits together | [`ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Toolchain traps, one entry per incident | [`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md) |
| Architecture decisions | [`adr/`](../adr/README.md) |
| Release & CI process | [`RELEASE.md`](../RELEASE.md) |
| Screens in all three versions | [`screens/`](../screens/) |

The ADRs used to sit in `docs/adr/`, where a single demo deploy would have deleted
them: the script wiped the whole directory. It now removes only the files it deploys,
and the documentation moved out — two independent reasons the hazard cannot come back.
