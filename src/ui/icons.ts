// Lucide-Icon-Font (src/fonts/lucide.ttf, ISC-Lizenz).
// Codepoints aus lucide-static/font/lucide.css; Nutzung: <Label class="lucide" :text="icons.house" />
export const icons = {
  // Tab-Bar
  house: '\ue0f5',
  compass: '\ue09b',
  monitorPlay: '\ue485',
  megaphone: '\ue235',
  userRound: '\ue468',
  // Player & Medien
  play: '\ue13c',
  pause: '\ue12e',
  circlePlay: '\ue080',
  radio: '\ue142',
  headphones: '\ue0f1',
  mic: '\ue118',
  video: '\ue1a5',
  // Aktionen
  bookmark: '\ue060',
  bookmarkCheck: '\ue51f',
  share: '\ue156',
  x: '\ue1b2',
  chevronLeft: '\ue06e',
  chevronRight: '\ue06f',
  arrowLeft: '\ue048',
  search: '\ue151',
  check: '\ue06c',
  refreshCw: '\ue145',
  externalLink: '\ue0b9',
  camera: '\ue064',
  // Inhalte & Status
  newspaper: '\ue348',
  fileText: '\ue0cc',
  mail: '\ue10f',
  calendar: '\ue063',
  mapPin: '\ue111',
  messageCircle: '\ue116',
  users: '\ue1a4',
  clock: '\ue087',
  sparkles: '\ue412',
  wifiOff: '\ue1af',
  heart: '\ue0f2',
  gift: '\ue0e1',
  settings: '\ue154',
} as const;

export type IconName = keyof typeof icons;
