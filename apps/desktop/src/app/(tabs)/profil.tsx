// Desktop route: (tabs)/profil. Unchanged from the phone.
//
// The screen itself is portable — it imports only names the GTK host answers —
// so this file exists to put it in this host's route tree, not to alter it. The
// two routes that DO differ are `_layout` and `(tabs)/_layout`, and each says why in
// its own header.
export { default } from '@/app/(tabs)/profil';
