// Desktop route: backstage. Unchanged from the phone.
//
// The screen itself is portable — it imports only names the GTK host answers —
// so this file exists to put it in this host's route tree, not to alter it. The
// three routes that DO differ are `_layout`, `(tabs)/_layout` and `artikel`, and
// each says why in its own header.
export { default } from '@/app/backstage';
