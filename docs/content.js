/* =============================================================================
 * content.js — CORRECTIV App · Content layer
 * -----------------------------------------------------------------------------
 * Single source of truth for everything the app displays. The shapes here are
 * modelled on a real headline CMS / REST response so that, in a production
 * build, each collection can be swapped 1:1 for live API data:
 *
 *   articles      GET /articles                (investigations + fact checks)
 *   media         GET /media                   (unified audio + video catalog)
 *   podcasts      GET /podcasts
 *   conversations GET /videos?series=gespraech (external YouTube embeds)
 *   claims        GET /faktenforum/claims
 *   callouts      GET /crowdnewsroom/callouts
 *   projects      GET /projects                (section fronts)
 *   discover      GET /navigation/discover
 *   spotlight     GET /spotlight/today
 *
 * IDs are stable string slugs. Cross-references (e.g. a project's article feed,
 * a verdict on a claim) are stored as ID references and resolved in the app
 * logic (see Correctiv App.dc.html → resolve* helpers), exactly as you would
 * dereference related resources returned by an API.
 *
 * NOTE: All copy is German and uses formal address ("Sie"), per the CORRECTIV
 * voice. Replace the sample text with real editorial content; keep the keys.
 * ===========================================================================*/

export const CONTENT = {
  /* ---- Brand / app chrome ------------------------------------------------ */
  brand: {
    name: 'CORRECTIV',
    tagline: 'Investigative. Independent. Non-profit.',
  },
  home: {
    // In production: derive from the device clock / server time.
    dateline: 'Freitag, 12. Juni 2026',
  },

  /* ---- ARTICLES ----------------------------------------------------------
   * type:      'investigation' | 'factcheck'
   * verdict:   only for fact checks — 'Falsch' | 'Größtenteils falsch'
   *            | 'Fehlender Kontext' | 'Richtig'
   * image:     { slot } — slot id wired to an <image-slot> the user fills in
   * body[]:    { type: 'paragraph' | 'heading' | 'callout', text }
   * ----------------------------------------------------------------------- */
  articles: [
    {
      id: 'hero',
      slug: 'die-perfekte-frau',
      type: 'investigation',
      kicker: 'RECHERCHE',
      title: 'Die Perfekte Frau: Wie Autokraten ein Ideal erschaffen',
      authors: 'CORRECTIV-Redaktion',
      publishedAt: '12. Juni 2026',
      readingMinutes: 12,
      image: { slot: 'img-hero' },
      body: [
        { type: 'paragraph', text: 'In mehreren autoritär regierten Staaten arbeiten Regierungen an einem Frauenbild, das in Kampagnen, Lehrplänen und Gesetzen auftaucht: jung, fürsorglich, kinderreich – und politisch still.' },
        { type: 'heading', text: 'Ein Ideal als Instrument' },
        { type: 'paragraph', text: 'CORRECTIV hat Kampagnenmaterial, Haushaltsposten und Reden aus mehreren Ländern ausgewertet. Das Muster: Familienpolitik wird zur Bühne, auf der Rollenbilder festgeschrieben werden.' },
        { type: 'callout', text: 'Diese Recherche ist Teil einer Serie über autoritäre Familienpolitik in Europa. Alle Teile finden Sie in der App unter „Recherchen“.' },
        { type: 'paragraph', text: 'Fachleute warnen: Wo das Ideal Gesetz wird, schrumpfen Spielräume – bei Scheidung, Erwerbsarbeit, Selbstbestimmung.' },
      ],
    },
    {
      id: 'pension',
      slug: 'pension-um-jeden-preis',
      type: 'investigation',
      kicker: 'RECHERCHE · FRÜHER LESEN',
      title: 'Pension um jeden Preis',
      authors: 'CORRECTIV-Redaktion',
      publishedAt: 'Für alle ab Montag, 15. Juni',
      readingMinutes: 14,
      image: { slot: 'img-pension' },
      earlyAccess: true, // Club members read this before public release
      body: [
        { type: 'paragraph', text: 'Versorgungswerke versprechen Sicherheit im Alter. Unsere Recherche zeigt, wie einzelne Kassen Risiken eingehen – und wer die Folgen trägt.' },
        { type: 'heading', text: 'Was die Unterlagen zeigen' },
        { type: 'paragraph', text: 'Monatelang haben wir Dokumente ausgewertet und mit Insidern gesprochen. Den Weg dorthin dokumentiert das Recherchetagebuch im Backstage.' },
        { type: 'paragraph', text: 'Nach Veröffentlichung dieser Recherche kündigte die Aufsicht eine Sonderprüfung an.' },
      ],
    },
    {
      id: 'heizung',
      slug: 'grossstaedte-heizungsgesetz',
      type: 'investigation',
      kicker: 'RECHERCHE',
      title: 'Großstädte warnen vor Reiches „Heizungsgesetz“',
      authors: 'CORRECTIV-Redaktion',
      publishedAt: '12. Juni 2026',
      readingMinutes: 8,
      image: { slot: 'img-heizung' },
      body: [
        { type: 'paragraph', text: 'Mehrere Großstädte sehen die kommunale Wärmeplanung gefährdet. Interne Stellungnahmen, die CORRECTIV vorliegen, zeichnen ein deutliches Bild.' },
        { type: 'paragraph', text: 'Die Recherche entstand im Netzwerk von CORRECTIV.Lokal mit über 1.700 Journalist:innen.' },
      ],
    },
    {
      id: 'denkfabrik',
      slug: 'denkfabrik-reiche',
      type: 'investigation',
      kicker: 'RECHERCHE',
      title: 'Von der rechten Denkfabrik zu Katherina Reiche',
      authors: 'CORRECTIV-Redaktion',
      publishedAt: '11. Juni 2026',
      readingMinutes: 10,
      image: { slot: 'img-denkfabrik' },
      body: [
        { type: 'paragraph', text: 'Personelle Verbindungen zwischen einer Denkfabrik und einem Bundesministerium werfen Fragen auf. CORRECTIV hat Lebensläufe, Vorträge und Netzwerke nachgezeichnet.' },
        { type: 'paragraph', text: 'Die Beteiligten hatten bis Redaktionsschluss Gelegenheit zur Stellungnahme.' },
      ],
    },
    {
      id: 'duerre',
      slug: 'duerre-region',
      type: 'investigation',
      kicker: 'KLIMA',
      title: 'So sehr leidet Ihre Region unter Dürre',
      authors: 'CORRECTIV-Redaktion',
      publishedAt: '11. Juni 2026',
      readingMinutes: 6,
      image: { slot: 'img-duerre' },
      body: [
        { type: 'paragraph', text: 'Wie trocken ist es vor Ihrer Haustür? Unsere Datenanalyse zeigt die Entwicklung der Bodenfeuchte für jede Region in Deutschland.' },
        { type: 'callout', text: 'In der App: Postleitzahl eingeben und die Auswertung für die eigene Region sehen (im Prototyp angedeutet).' },
        { type: 'paragraph', text: 'Die Daten stammen aus öffentlichen Messnetzen und wurden vom CORRECTIV-Datenteam aufbereitet.' },
      ],
    },
    {
      id: 'fcKiew',
      slug: 'faktencheck-botschaft-kiew',
      type: 'factcheck',
      kicker: 'FAKTENCHECK',
      title: 'US-Botschaft in Kiew wurde nicht evakuiert – Grok und Community Notes liegen bei KI-Fake falsch',
      authors: 'CORRECTIV.Faktencheck',
      publishedAt: '12. Juni 2026',
      readingMinutes: 5,
      image: { slot: 'img-fc-kiew' },
      verdict: 'Falsch',
      body: [
        { type: 'callout', text: 'Behauptung: Ein Video auf X soll zeigen, dass die US-Botschaft in Kiew evakuiert wird.' },
        { type: 'paragraph', text: 'Das Video ist KI-generiert. Eine Bild-Rückwärtssuche und Auffälligkeiten im Material belegen das. Die Botschaft dementiert eine Evakuierung.' },
        { type: 'heading', text: 'Auch KI-Assistenten lagen falsch' },
        { type: 'paragraph', text: 'Grok und Community Notes stuften das Video zunächst falsch ein – ein Beispiel dafür, warum automatisierte Prüfung menschliche Faktenchecks nicht ersetzt.' },
      ],
    },
    {
      id: 'fcMerz',
      slug: 'faktencheck-merz-mindestlohn',
      type: 'factcheck',
      kicker: 'FAKTENCHECK',
      title: 'KI-Stimme von Friedrich Merz verkündet erfundene Mindestlohn-Kürzung auf Tiktok',
      authors: 'CORRECTIV.Faktencheck',
      publishedAt: '11. Juni 2026',
      readingMinutes: 4,
      image: { slot: 'img-fc-merz' },
      verdict: 'Falsch',
      body: [
        { type: 'callout', text: 'Behauptung: In einem Tiktok-Video kündigt Friedrich Merz eine Kürzung des Mindestlohns an.' },
        { type: 'paragraph', text: 'Die Tonspur ist eine KI-generierte Stimmimitation. Eine solche Ankündigung gibt es nicht.' },
        { type: 'paragraph', text: 'Woran Sie KI-Stimmen erkennen: unnatürliche Betonung, fehlende Atemgeräusche, asynchrone Lippenbewegungen.' },
      ],
    },
  ],

  /* ---- MEDIA (unified audio + video catalog) -----------------------------
   * One catalog drives the single, persistent media player. The `kind`
   * discriminator tells the player how to render and play an item:
   *
   *   kind: 'video'  provider 'peertube'  → embedded <iframe> player
   *   kind: 'audio'  provider 'stream'    → HTMLAudioElement (live radio)
   *   kind: 'audio'  provider 'preview'   → HTMLAudioElement, preview-gated
   *
   * Adding a new playable item = add an entry here; the player needs no
   * per-item code.
   * ----------------------------------------------------------------------- */
  media: [
    // -- FunFacts — daily, on CORRECTIV's own PeerTube instance --
    // peertubeId → https://tube.funfacts.de/videos/embed/<id> (player)
    //            → https://tube.funfacts.de/w/<id>            (watch page)
    {
      id: 'ff-kuehl', kind: 'video', provider: 'peertube', series: 'FunFacts',
      peertubeId: 'kUhwmjgPdLYwn8hHz7DMG9',
      kicker: 'NEUE FOLGE', episode: 'Heute', duration: '15 Min.',
      title: 'Hey, das ist mal ’ne gute Idee gegen Superreiche', host: 'mit Maike Kühl',
      description: 'Eine Milliardärsteuer — absurd oder überfällig? Maike Kühl seziert den Vorschlag mit dem üblichen Fun-Facts-Mix aus Recherche und Pointe.',
      featured: true,
    },
    {
      id: 'ff-kling', kind: 'video', provider: 'peertube', series: 'FunFacts',
      peertubeId: 'bH7AcBRjkcSiKj35bUBi1W',
      kicker: 'FOLGE #001', episode: '3. März', duration: '15 Min.',
      title: 'Wie die CDU zwischen Gaslobby und Klimazielen versagt', host: 'mit Marc-Uwe Kling',
      description: 'Die allererste Folge: Marc-Uwe Kling über Gaslobby, Klimaziele und die Lücke dazwischen.',
    },
    {
      id: 'ff-kaenguru', kind: 'video', provider: 'peertube', series: 'FunFacts',
      peertubeId: 'gTm1pZD5MrYdmETVbPMvBJ',
      kicker: 'KÄNGURU-ARCHIV', episode: '24. Feb', duration: '6 Min.',
      title: 'Das Problem mit dem Internet', host: 'Perlen aus dem Archiv',
      description: 'Eine Perle aus dem Känguru-Archiv — kurz, pointiert, zeitlos.',
    },
    {
      id: 'ff-soalt', kind: 'video', provider: 'peertube', series: 'FunFacts',
      peertubeId: 'oPFP8S2Mm8BiZ1NQGrWPMS',
      kicker: 'KURZ', episode: '11. Mai', duration: '3 Min.',
      title: 'So alt', host: 'Fun Facts',
      description: 'Ein kurzer Clip aus der Fun-Facts-Werkstatt.',
    },
    {
      id: 'ff-teaser', kind: 'video', provider: 'peertube', series: 'FunFacts',
      peertubeId: '28WPAQPuwZcayZiRfMiABb',
      kicker: 'TEASER', episode: 'Trailer', duration: '2 Min.',
      title: 'Fun Facts — Der Teaser', host: 'Fun Facts',
      description: 'Ab 02.03.2026 jeden Tag eine Folge: ein tägliches, fünfzehnminütiges Nachrichtenformat mit Humor. Facts, but funny.',
    },

    // -- Salon5 Radio — live stream --
    {
      id: 'radio-salon5', kind: 'audio', provider: 'stream',
      streamUrl: 'https://icecast.correctiv.net/salon5low',
      title: 'Salon5 Radio', subtitle: '24/7 aus Bottrop — von Jugendlichen für Jugendliche',
      live: true, artwork: { slot: 'img-radio' },
    },

    // -- Backstage bonus episode — 60s preview for guests, full for members --
    {
      id: 'bonus-pension', kind: 'audio', provider: 'preview',
      title: 'Wie wir an die Pensionskassen-Daten kamen',
      subtitle: 'Bonusfolge · Backstage', duration: '23 Min.',
      previewSeconds: 60, clubOnly: true, artwork: { slot: 'img-bonus' },
      description: 'Das Recherche-Team über verschlossene Türen, Umwege und einen entscheidenden Hinweis.',
    },
  ],

  /* ---- PODCASTS (Mediathek shelf) --------------------------------------- */
  podcasts: [
    { id: 'pausenbrot', title: 'Pausenbrot', cadence: 'Salon5 · Mo–Fr', cover: { slot: 'img-pod-pausenbrot' } },
    { id: 'deeptalk', title: 'Deeptalk', cadence: 'Salon5 · wöchentlich', cover: { slot: 'img-pod-deeptalk' } },
    { id: 'mission-klima', title: 'Mission Klima', cadence: 'Salon5', cover: { slot: 'img-pod-klima' } },
    { id: 'correctiv-podcast', title: 'CORRECTIV Podcast', cadence: 'Hintergründe', cover: { slot: 'img-pod-correctiv' } },
  ],

  /* ---- CONVERSATIONS — "CORRECTIV im Gespräch" (external YouTube) -------- */
  conversations: [
    { id: 'gueler', title: 'Wo steht die CDU in der Integrationsdebatte? – mit Serap Güler', source: 'YouTube', duration: '43 Min.', thumb: 'https://i.ytimg.com/vi/6xz23UXKsNo/hqdefault.jpg', slot: 'img-vid-gueler' },
    { id: 'demokratie', title: 'Die Aushöhlung der Demokratie – mit Anna-Mira Brandau und Maximilian Steinbeis', source: 'YouTube', duration: '51 Min.', thumb: 'https://i.ytimg.com/vi/timGjj1j5MA/hqdefault.jpg', slot: 'img-vid-demokratie' },
  ],

  /* ---- FAKTENFORUM CLAIMS ------------------------------------------------
   * status: 0 submitted · 1 in review · 2 checked
   * sources[].confidence: free-text rating; tone keys the dot color in logic
   * ----------------------------------------------------------------------- */
  claims: [
    {
      id: 'kiew', status: 2,
      claim: 'Video zeigt angeblich die Evakuierung der US-Botschaft in Kiew',
      meta: 'Eingereicht vor 2 Tagen · 14 Prüfungen',
      sources: [
        { name: 'Ursprungspost auf X', confidence: 'irreführend', tone: 'accent' },
        { name: 'Pressestelle der Botschaft', confidence: 'belastbar', tone: 'strong' },
      ],
    },
    {
      id: 'merz', status: 2,
      claim: 'Friedrich Merz kündigt auf Tiktok eine Mindestlohn-Kürzung an',
      meta: 'Eingereicht vor 3 Tagen · 11 Prüfungen',
      sources: [
        { name: 'Tiktok-Video (KI-Stimme)', confidence: 'gefälscht', tone: 'accent' },
        { name: 'Transkript-Abgleich Bundestag', confidence: 'belastbar', tone: 'strong' },
      ],
    },
    {
      id: 'duerre-foto', status: 1,
      claim: 'Foto zeigt angeblich Dürreschäden in Brandenburg von 2026',
      meta: 'Eingereicht gestern · 4 Prüfungen',
      sources: [
        { name: 'Facebook-Post', confidence: 'ungeklärt', tone: 'faint' },
        { name: 'Bild-Rückwärtssuche', confidence: 'läuft', tone: 'faint' },
      ],
    },
    {
      id: 'co2', status: 0,
      claim: 'Kassenbon beweist angeblich eine „versteckte CO₂-Steuer“ im Supermarkt',
      meta: 'Eingereicht heute · noch keine Prüfung',
      sources: [
        { name: 'Foto eines Kassenbons', confidence: 'ungeklärt', tone: 'faint' },
      ],
    },
    {
      id: 'zitat', status: 1,
      claim: 'Zugespitztes Zitat einer Lokalpolitikerin zur Wärmeplanung',
      meta: 'Eingereicht gestern · 2 Prüfungen',
      sources: [
        { name: 'Geteilte Bildkachel', confidence: 'ungeklärt', tone: 'faint' },
        { name: 'Ratsprotokoll', confidence: 'läuft', tone: 'faint' },
      ],
    },
  ],

  /* ---- CALLOUTS — CrowdNewsroom / surveys -------------------------------
   * Drives the participation cards and the multi-step contribution flow.
   * progress: 0..1 (rendered as a bar); options → single chips in step 1
   * ----------------------------------------------------------------------- */
  callouts: [
    {
      id: 'stadt', kicker: 'CROWDNEWSROOM', label: 'Mitmachen', emphasis: true,
      title: 'Wem gehört die Stadt?',
      teaser: 'Helfen Sie uns herauszufinden, wer von steigenden Mieten profitiert. Ihre Erfahrung zählt.',
      description: 'Steigende Mieten, anonyme Eigentümer: Gemeinsam mit Ihnen recherchieren wir, wer vom Geschäft mit der Miete profitiert. Ihre Erfahrung als Mieter:in zählt.',
      org: 'Das CrowdNewsroom-Team von CORRECTIV. Verantwortlich im Sinne des Presserechts.',
      privacy: 'Ihre Angaben werden vertraulich behandelt und nur für diese Recherche genutzt. Veröffentlicht wird nichts, was Rückschlüsse auf Sie zulässt — außer Sie stimmen ausdrücklich zu.',
      contributions: '2.143 Beiträge', progress: 0.71,
      q1: 'Wem gehört die Wohnung, in der Sie zur Miete wohnen?',
      options: ['Privatperson', 'Wohnungsunternehmen', 'Genossenschaft', 'Weiß ich nicht'],
      q2: 'Was haben Sie bei Mieterhöhungen erlebt?',
      hasPhoto: true,
    },
    {
      id: 'zukunft', kicker: 'UMFRAGE', label: 'Teilnehmen', emphasis: false,
      title: 'Die Zukunft von CORRECTIV: Wir fragen Sie',
      teaser: 'Ihre Antworten fließen direkt in unsere Planung ein. Fünf Minuten genügen.',
      description: 'Wohin soll sich CORRECTIV entwickeln? Ihre Antworten fließen direkt in unsere Planung ein.',
      org: 'Die Geschäftsführung und Redaktionsleitung von CORRECTIV.',
      privacy: 'Die Umfrage ist anonym. Es werden keine personenbezogenen Daten gespeichert.',
      contributions: '5.812 Teilnahmen', progress: 0.58,
      q1: 'Was wünschen Sie sich mehr von CORRECTIV?',
      options: ['Mehr Lokal-Recherchen', 'Mehr Faktenchecks', 'Mehr Audio & Video', 'Mehr Mitmach-Aktionen'],
      q2: 'Was möchten Sie uns mitgeben?',
      hasPhoto: false,
    },
  ],

  /* ---- PROJECTS — section fronts ----------------------------------------
   * `feed` lists article IDs (resolved against `articles` in the logic).
   * `action` is the front's primary affordance; `actionKind` lets the logic
   * bind a behaviour (e.g. 'radio' starts Salon5 Radio).
   * ----------------------------------------------------------------------- */
  projects: [
    { id: 'fakten', badge: 'CORRECTIV.FAKTENCHECK', title: 'Faktencheck',
      description: 'Wir prüfen virale Behauptungen und KI-Fakes — täglich, transparent, mit offengelegten Quellen.',
      action: 'Tipp per WhatsApp senden ↗', actionKind: 'link', feed: ['fcKiew', 'fcMerz'] },
    { id: 'klima', badge: 'THEMA', title: 'Klimawandel',
      description: 'Daten, Recherchen und Faktenchecks zur Klimakrise — und was sie für Ihre Region bedeutet.',
      action: 'Newsletter Klima abonnieren', actionKind: 'link', feed: ['duerre', 'heizung'] },
    { id: 'salon5', badge: 'SALON5', title: 'Salon5',
      description: 'Die Jugendredaktion von CORRECTIV — mit eigenem Radio, rund um die Uhr aus Bottrop.',
      action: 'Salon5 Radio hören', actionKind: 'radio', feed: ['hero'] },
    { id: 'lokal', badge: 'CORRECTIV.LOKAL', title: 'Lokal',
      description: 'Ein Netzwerk von über 1.700 Lokaljournalist:innen recherchiert gemeinsam, was Orte bewegt.',
      action: 'Zum Netzwerk ↗', actionKind: 'link', feed: ['heizung'] },
    { id: 'schweiz', badge: 'CORRECTIV.SCHWEIZ', title: 'Schweiz',
      description: 'Recherchen aus und für die Schweiz — unabhängig und gemeinnützig.',
      action: 'Spotlight Schweiz abonnieren', actionKind: 'link', feed: ['pension'] },
  ],

  /* ---- DISCOVER directory (Entdecken tab) -------------------------------
   * Each item targets either a tab, a project, an overlay, or nothing (ext.).
   * target.type: 'tab' | 'project' | 'overlay' | null
   * ----------------------------------------------------------------------- */
  discover: {
    chips: [
      { label: 'Klima', target: { type: 'project', id: 'klima' } },
      { label: 'Faktenchecks', target: { type: 'project', id: 'fakten' } },
      { label: 'AfD-Recherchen', target: null },
      { label: 'Lokal', target: { type: 'project', id: 'lokal' } },
      { label: 'Schweiz', target: { type: 'project', id: 'schweiz' } },
      { label: 'Jugend', target: { type: 'project', id: 'salon5' } },
    ],
    groups: [
      { name: 'RECHERCHIEREN', items: [
        { name: 'Recherchen', desc: 'Investigative Berichte von correctiv.org', target: { type: 'tab', id: 'home' } },
        { name: 'Faktencheck', desc: 'Virale Behauptungen, täglich geprüft', target: { type: 'project', id: 'fakten' } },
        { name: 'CORRECTIV.Schweiz', desc: 'Recherchen aus der Schweiz', target: { type: 'project', id: 'schweiz' } },
        { name: 'CORRECTIV.Lokal', desc: 'Netzwerk: 1.700+ Journalist:innen', target: { type: 'project', id: 'lokal' } },
        { name: 'CORRECTIV.Europe', desc: 'Bald: Recherchen für Europa', target: null },
      ]},
      { name: 'JUNGE FORMATE', items: [
        { name: 'Salon5', desc: 'Jugendredaktion mit 24/7-Radio', target: { type: 'project', id: 'salon5' } },
        { name: 'FunFacts', desc: 'Fakten gegen Fakes — als Video', target: { type: 'tab', id: 'mediathek' } },
      ]},
      { name: 'MITMACHEN', items: [
        { name: 'CrowdNewsroom', desc: 'Bürgerrecherchen — Ihr Wissen zählt', target: { type: 'tab', id: 'mitmachen' } },
        { name: 'Faktenforum', desc: 'Community-Faktenchecks', target: { type: 'overlay', id: 'faktenforum' } },
        { name: 'Abriss-Atlas', desc: 'Gebäudeabrisse melden (DE/CH)', target: { type: 'tab', id: 'mitmachen' } },
      ]},
      { name: 'LERNEN', items: [
        { name: 'Reporterfabrik', desc: 'Workshops: Journalismus für alle', target: null },
        { name: 'Reporter4You', desc: 'Medienbildung für Schulen', target: null },
      ]},
      { name: 'DATENBANKEN & WERKZEUGE', items: [
        { name: 'Sunlight', desc: 'Lobby- und Machtstrukturen durchsuchen', target: null },
        { name: 'NSDAP-Mitgliederkartei', desc: 'Historische Datenbank', target: null },
      ]},
      { name: 'VERLAG & BÜHNE', items: [
        { name: 'CORRECTIV Verlag', desc: 'Bücher & Bookzines — shop.correctiv.org', target: null },
        { name: 'Theater', desc: 'ATLAS, Das Kraftwerk', target: null },
      ]},
      { name: 'EXILE-MEDIEN', items: [
        { name: 'Radio Sakharov', desc: 'Unabhängige Stimmen im Exil', target: null },
        { name: 'Özgürüz', desc: 'Türkisch-deutsches Exilmedium', target: null },
      ]},
    ],
  },

  /* ---- NEWSLETTERS (Profil toggles) ------------------------------------- */
  newsletters: [
    { id: 'spot', label: 'Spotlight', defaultOn: true },
    { id: 'schweiz', label: 'Spotlight Schweiz', defaultOn: false },
    { id: 'klima', label: 'Klima', defaultOn: true },
  ],

  /* ---- ONBOARDING interest chips ---------------------------------------- */
  interestChips: ['AfD-Recherchen', 'Klima', 'Gesundheit', 'Russland/Ukraine', 'Faktenchecks', 'Lokal', 'Schweiz', 'Jugend/Salon5'],

  /* ---- SPOTLIGHT (daily briefing + reader edition) ---------------------- */
  spotlight: {
    date: 'Freitag, 12. Juni 2026',
    time: '6:30',
    // Compact briefing rows on the Home screen
    briefing: [
      { text: 'Pensionskassen: Aufsicht kündigt nach CORRECTIV-Recherche Sonderprüfung an' },
      { text: 'Faktencheck: KI-Fake zur US-Botschaft in Kiew verbreitet sich weiter' },
      { text: 'CrowdNewsroom: „Wem gehört die Stadt?“ erreicht 2.000 Beiträge' },
    ],
    // Full edition shown in the Spotlight reader overlay
    intro: 'Guten Morgen! Das Wichtigste aus dem CORRECTIV-Kosmos — kuratiert von der Redaktion.',
    edition: [
      { title: 'Pensionskassen: Aufsicht kündigt Sonderprüfung an', text: 'Nach unserer Recherche „Pension um jeden Preis“ reagiert die Finanzaufsicht. Was das für Versicherte bedeutet, lesen Sie kommende Woche.' },
      { title: 'KI-Fake zur US-Botschaft in Kiew', text: 'Ein Video verbreitet sich millionenfach — und selbst KI-Assistenten fallen darauf herein. Unser Faktencheck zeigt, woran Sie den Fake erkennen.' },
      { title: '2.000 Beiträge für „Wem gehört die Stadt?“', text: 'Unser CrowdNewsroom wächst. Jeder Beitrag hilft, das Geschäft mit der Miete transparent zu machen — machen Sie mit.' },
    ],
    outro: 'Bleiben Sie aufmerksam — Ihre CORRECTIV-Redaktion',
  },

  /* ---- CLUB / membership -------------------------------------------------
   * Static copy + tiers for the join flow and member surfaces.
   * ----------------------------------------------------------------------- */
  club: {
    member: { name: 'Alex Beispiel', since: 'Mitglied seit Juni 2026', amount: 10, cadence: 'im Monat' },
    pledgePoints: [
      'Gemeinnützig — keine Eigentümer, keine Aktionäre',
      'Spendenfinanziert — unabhängig von Konzernen',
      'Ohne Paywall — Recherchen bleiben frei zugänglich',
    ],
    amount: { min: 5, max: 50, default: 10 },
    perks: [
      { threshold: 15, text: 'Ab 15 €: jährliches Bookzine des CORRECTIV Verlags per Post' },
      { threshold: 30, text: 'Ab 30 €: signierte Neuerscheinung des Verlags' },
    ],
    impactArticles: ['Die Perfekte Frau', 'Pension um jeden Preis', 'So sehr leidet Ihre Region unter Dürre'],
  },
};

/* Convenience getters — keep callers from re-implementing lookups. */
export const byId = (list, id) => (list || []).find((x) => x && x.id === id) || null;
export const article = (id) => byId(CONTENT.articles, id);
export const mediaItem = (id) => byId(CONTENT.media, id);
