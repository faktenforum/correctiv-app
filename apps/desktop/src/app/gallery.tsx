// Desktop route: gallery. Unchanged from the phone, and the most useful screen this
// host has for finding its own faults.
//
// The screen itself is portable — it imports only names the GTK host answers — so
// this file exists to put it in this host's route tree, not to alter it. The two
// routes that DO differ are `_layout` and `(tabs)/_layout`, and each says why in its
// own header.
//
// WHY IT IS WORTH MORE HERE THAN ON THE PHONE. `route-sweep` opens 25 screens and is
// this host's only oracle for a render-time refusal, but what it covers is whichever
// components those screens happen to USE, in whichever variants they happen to PASS.
// This route draws every component in `src/components`, in the variants its props
// allow, and the phone's own `__tests__/gallery-catalogue.test.ts` fails when one is
// missing — so the list cannot quietly shrink. `npm run component-sweep` is that
// catalogue opened on GTK, and `?c=folder/Name` is what lets a refusal name the
// component instead of the primitive alone.
//
// A DEVELOPER PAGE THAT COSTS NOTHING TO SHIP, on the phone's own reasoning in
// `apps/mobile/src/app/gallery.tsx`: the components it draws are already in the
// bundle, because real screens use them. Nothing here ships anyway.
export { default } from '@/app/gallery';
