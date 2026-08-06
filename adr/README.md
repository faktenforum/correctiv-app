# Architecture decisions

Six decisions shaped this repo. Read them when you want to know *why* something is
the way it is; [`../ARCHITECTURE.md`](../ARCHITECTURE.md) describes *what* it is.

| | Decision | Status |
| --- | --- | --- |
| [0001](0001-monorepo-and-platform-free-core.md) | A monorepo with a platform-free core, and why the directory is `app-core` | accepted |
| [0002](0002-vite-8-rolldown-evaluation.md) | Stay on Vite 7 — Rolldown silently drops the NativeScript polyfills | accepted |
| [0003](0003-audio-capability-spike.md) | What the audio stack can and cannot do, measured on a device | accepted |
| [0004](0004-react-native-pivot.md) | Move to React Native / Expo, with a web target | accepted |
| [0005](0005-react-native-over-nativescript.md) | Expo is the stack; what NativeScript was better at, and when to revisit | accepted, amended by 0006 |
| [0006](0006-one-core-two-hosts.md) | The core holds the behaviour; both apps stay for now | accepted |

Two notes for readers of the older ones:

- ADRs 0001–0004 cite a strategy paper (`APP-STRATEGIE.md`, revision 2, July 2026)
  that recommended staying on NativeScript. ADR 0004 reversed that recommendation and
  the paper was removed from the working tree on 2026-08-06; it is in the git history
  if you need the original wording.
- ADR 0005 scheduled `apps/mobile` for removal in a phase 5. [ADR
  0006](0006-one-core-two-hosts.md) suspends that schedule without reopening the
  stack question: the argument against keeping both was that the core was not
  actually shared, and it is now.

ADR 0004 is long because it doubles as the changelog of the pivot. Its "Offen"
section is superseded by ADR 0006's "What is still open".
