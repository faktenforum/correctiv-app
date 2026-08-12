# Architecture decisions

Seven decisions shaped this repo. Read them when you want to know *why* something is
the way it is; [`../ARCHITECTURE.md`](../ARCHITECTURE.md) describes *what* it is.

| | Decision | Status |
| --- | --- | --- |
| [0001](0001-monorepo-and-platform-free-core.md) | A monorepo with a platform-free core, and why the directory is `app-core` | accepted |
| [0002](0002-vite-8-rolldown-evaluation.md) | Stay on Vite 7 — Rolldown silently drops the NativeScript polyfills | moot since 0007; kept for the measurement |
| [0003](0003-audio-capability-spike.md) | What the audio stack can and cannot do, measured on a device | accepted |
| [0004](0004-react-native-pivot.md) | Move to React Native / Expo, with a web target | accepted |
| [0005](0005-react-native-over-nativescript.md) | Expo is the stack; what NativeScript was better at, and when to revisit | accepted, amended by 0006, carried out by 0007 |
| [0006](0006-one-core-two-hosts.md) | The core holds the behaviour; both apps stay for now | accepted; its second host is gone (0007), its core split is not |
| [0007](0007-removing-the-nativescript-host.md) | Removing the NativeScript host — the audit first, then the deletion | accepted |

Four notes for readers of the older ones:

- ADRs 0001–0004 were written in German and translated on 2026-08-11, so the repo
  reads in one language ([AGENTS.md](../AGENTS.md#language)). Only the wording
  changed; the German originals are in the git history.
- ADRs 0001–0004 cite a strategy paper (`APP-STRATEGIE.md`, revision 2, July 2026)
  that recommended staying on NativeScript. ADR 0004 reversed that recommendation and
  the paper was removed from the working tree on 2026-08-06; it is in the git history
  if you need the original wording.
- ADR 0005 scheduled `apps/mobile` for removal in a phase 5; ADR 0006 suspended that
  schedule; [ADR 0007](0007-removing-the-nativescript-host.md) carried it out on
  2026-08-12. Read 0006 for what the core is and why, not for how many apps there
  are — that half of it is history, and the reason it gives for the split is the
  reason the split survived the removal.
- ADRs 0002 and 0006 describe a NativeScript app that is no longer in the tree. They
  are records, not descriptions: neither has been rewritten, and 0007 says which of
  their statements have expired.

ADR 0004 is long because it doubles as the changelog of the pivot. Its "Offen"
section is superseded by ADR 0006's "What is still open", of which
[ADR 0007](0007-removing-the-nativescript-host.md) closes all but the CORS item.
