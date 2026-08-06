import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { ArticleRow } from '@/components/feed/ArticleRow';
import { Button, Card, Hairline, SectionHeader, Typo } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { interests } from '@correctiv/app-core/data/interests';
import { projectGroups, resolveProject, type Project } from '@correctiv/app-core/data/projects';
import type { FeedKey } from '@correctiv/app-core/types/models';
import { useFeed } from '@/lib/feeds/useFeed';
import { openArticle } from '@/lib/openArticle';
import { openExternal } from '@/lib/openExternal';
import { colors } from '@/lib/theme';

/** Die projekteigene Aktion — Beschriftung und Ziel an einer Stelle. */
const ACTIONS: Record<NonNullable<Project['action']>, { label: string; run: () => void }> = {
  'whatsapp-tip': {
    label: 'Tipp per WhatsApp schicken',
    // Die echte Tipp-Nummer der Faktencheck-Redaktion.
    run: () => openExternal('https://wa.me/4915142647500'),
  },
  radio: {
    label: 'Salon5 Radio hören',
    // Der Live-Stream gehört zum Player, und der wird in Phase 4c EIN
    // App-Singleton (expo-audio). Ein zweiter Player hier wäre ein zweiter
    // Zustand für dieselbe Wiedergabe — deshalb nur der Sprung in die Mediathek.
    run: () => router.push('/(tabs)/mediathek'),
  },
  'local-network': {
    label: 'Teil des Lokal-Netzwerks werden',
    run: () => openExternal('https://correctiv.org/lokal/'),
  },
};

/**
 * Jede Kennung, die diese Route bedienen kann — für den statischen Web-Export.
 *
 * Ohne das entsteht nur `projekt/[id].html`, und ein statischer Host (GitHub
 * Pages, kein Rewrite) antwortet auf /projekt/klima mit 404. Verifiziert: vor
 * dieser Funktion war genau das der Fall. Nativ ist davon nichts betroffen — dort
 * gibt es keine URLs, nur den Router.
 *
 * Der Namensraum ist derselbe, den `resolveProject` auflöst: Projekte plus
 * Themen mit Feed. Set, weil `klima`, `lokal` und `schweiz` in beiden stehen.
 */
export function generateStaticParams(): { id: string }[] {
  const ids = new Set([
    ...projectGroups.flatMap((group) => group.projects.map((project) => project.id)),
    ...interests.filter((topic) => topic.feed).map((topic) => topic.id),
  ]);
  return [...ids].map((id) => ({ id }));
}

/**
 * Eine Vorlage für alle Projekt- und Themenseiten: Kopf, projekteigene Aktion,
 * Live-Feed.
 *
 * `id` kommt aus dem Verzeichnis oder aus der Themenschiene — `resolveProject`
 * im Core kennt beide Namensräume (und dokumentiert, warum das Projekt gewinnt).
 *
 * Der Designentwurf trennt im Kopf ein kurzes Badge von einem langen Titel; die
 * Daten haben nur einen `name`, beides zu zeigen würde denselben String
 * doppeln. Deshalb hier Titel + Beschreibung.
 */
export default function ProjektScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = resolveProject(id ?? '');
  const action = project?.action ? ACTIONS[project.action] : null;

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />

      {!project ? (
        <View className="flex-1 items-center justify-center px-m">
          <Typo variant="headline-s" className="text-center">
            Dieses Projekt gibt es nicht
          </Typo>
          <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
            {id ? `Unbekannte Kennung „${id}“.` : 'Es wurde keine Kennung übergeben.'}
          </Typo>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-m pt-m pb-2xl"
          showsVerticalScrollIndicator={false}
        >
          <Typo variant="headline-l">{project.name}</Typo>
          <Typo variant="text-m" color="grey-600" className="mt-2xs">
            {project.description}
          </Typo>

          {action && (
            <Button title={action.label} variant="outline" onPress={action.run} className="mt-s" />
          )}

          {project.feed && <ProjectFeed feed={project.feed} />}

          {project.teaserOnly && (
            <Card tone="surface" className="mt-m">
              <Typo variant="headline-xs">Bald verfügbar</Typo>
              <Typo variant="text-s" color="grey-600" className="mt-4xs">
                {project.name} startet gerade — die ersten Inhalte erscheinen hier, sobald sie
                veröffentlicht sind.
              </Typo>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Eigene Komponente, weil `useFeed` ein Hook ist: auf einer Seite ohne Feed darf
 * er nicht bedingt aufgerufen werden.
 */
function ProjectFeed({ feed }: { feed: FeedKey }) {
  const { data, loading, error } = useFeed(feed);
  const items = data?.slice(0, 12) ?? [];

  return (
    <View className="mt-l">
      <SectionHeader title="Neueste Beiträge" />

      {loading && items.length === 0 && (
        <View className="py-l">
          <ActivityIndicator color={colors.emphasis} />
        </View>
      )}

      {/* Kein stiller Dauer-Spinner: ohne Netz und ohne Cache steht hier, dass
          nichts geladen werden konnte. Auf dem Web-Target ist das der Regelfall,
          solange correctiv.org keinen CORS-Header sendet (ADR 0004). */}
      {error && items.length === 0 && !loading && (
        <Typo variant="text-s" color="grey-600" className="mt-2xs">
          Beiträge konnten nicht geladen werden.
        </Typo>
      )}

      <View className="mt-2xs">
        {items.map((item, i) => (
          <View key={item.id}>
            {i > 0 && <Hairline />}
            <ArticleRow item={item} onPress={openArticle} />
          </View>
        ))}
      </View>
    </View>
  );
}
