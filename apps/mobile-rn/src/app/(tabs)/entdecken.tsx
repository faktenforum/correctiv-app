import { router } from 'expo-router';
import { View } from 'react-native';

import { ProjectRow } from '@/components/discover/ProjectRow';
import { SearchEntry } from '@/components/discover/SearchEntry';
import { TopicRail } from '@/components/discover/TopicRail';
import { Overline, Screen, Typo } from '@/components/ui';
import { projectGroups, type Project } from '@correctiv/app-core/data/projects';
import { projectTarget } from '@/lib/discover/target';
import { openExternal } from '@/lib/openExternal';

/**
 * Entdecken — das geordnete Verzeichnis des Ökosystems: Sucheinstieg,
 * Themenschiene, 7 Projektgruppen aus dem Konzept.
 *
 * Der Katalog kommt vollständig aus `@correctiv/app-core/data/projects`; dieser
 * Bildschirm entscheidet nur, was ein Tippen bedeutet.
 */
export default function EntdeckenScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-s">
        Entdecken
      </Typo>

      <SearchEntry onPress={() => router.push('/suche')} />

      <View className="mt-s">
        <TopicRail onOpenTopic={openProject} />
      </View>

      {projectGroups.map((group) => (
        <View key={group.id} className="mt-m">
          <Overline label={group.title} />
          <View className="mt-2xs">
            {group.projects.map((project) => (
              <ProjectRow key={project.id} project={project} onPress={openProjectCard} />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function openProject(id: string) {
  router.push({ pathname: '/projekt/[id]', params: { id } });
}

/** Ausführen, was `projectTarget` entschieden hat — die Entscheidung selbst ist dort. */
function openProjectCard(project: Project) {
  const target = projectTarget(project);
  switch (target.kind) {
    case 'tab':
      router.push(target.path);
      return;
    case 'external':
      openExternal(target.url);
      return;
    default:
      openProject(target.id);
  }
}
