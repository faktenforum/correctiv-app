# docs/ is generated — do not hand-edit

This directory is the **GitHub Pages output** (live at
<https://faktenforum.github.io/correctiv-app/>). Everything here except this file is
copied in by `scripts/deploy-demo.sh` from the sibling repo `design-entwurf/project`
and will be overwritten on the next deploy.

Hand-written documentation therefore lives **outside** this directory:

| What | Where |
| --- | --- |
| Architecture decisions | [`adr/`](../adr/) |
| Release & CI process | [`RELEASE.md`](../RELEASE.md) |
| App strategy | [`APP-STRATEGIE.md`](../APP-STRATEGIE.md) |
| Project overview | [`README.md`](../README.md) |

The ADRs used to sit in `docs/adr/`, where a single demo deploy would have deleted
them: the script wiped the whole directory. It now removes only the files it
deploys, and the documentation moved out — two independent reasons the hazard
cannot come back.
