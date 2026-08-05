import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import type { Project } from '@correctiv/app-core/data/projects';
import { projectTarget } from '@/lib/discover/target';
import { colors } from '@/lib/theme';

/**
 * Eine Zeile im Verzeichnis: Name, zweizeiliger Teaser, Pfeil rechts.
 *
 * Hairline-getrennte Zeilen statt der Karten des NativeScript-Stands — so steht
 * es im Designentwurf (DiscoverScreen.dc.html), und bei 17 Einträgen in 7
 * Gruppen liest eine Liste sich schlicht besser als 17 graue Kästen.
 */
export function ProjectRow({
  project,
  onPress,
}: {
  project: Project;
  onPress: (project: Project) => void;
}) {
  // Dasselbe Ziel, das der Bildschirm öffnet — hier nur, um vorher zu sagen, ob
  // es die App verlässt.
  const external = projectTarget(project).kind === 'external';
  return (
    <Pressable
      onPress={() => onPress(project)}
      accessibilityRole="link"
      accessibilityLabel={project.name}
      className="flex-row items-center border-b border-grey-300 py-s active:opacity-70"
    >
      <View className="flex-1 pr-s">
        <Typo variant="text-m" weight="bold">
          {project.name}
        </Typo>
        <Typo variant="text-s" color="grey-600" numberOfLines={2} className="mt-4xs">
          {project.description}
        </Typo>
      </View>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={16}
        color={colors['grey-500']}
      />
    </Pressable>
  );
}
