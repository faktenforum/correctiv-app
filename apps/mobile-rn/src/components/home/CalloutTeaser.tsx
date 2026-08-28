import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Button, Overline, Typo } from '@/components/ui';
import type { Callout } from '@correctiv/app-core/data/callouts';
import { formatNumberDe } from '@correctiv/app-core/lib/format';
import { calloutStyle } from '@/lib/participate/calloutStyle';
import { colors } from '@/lib/theme';

/**
 * The participate module on Home: one open callout, dark card, coral button.
 *
 * Dark is the point. Everything above it is journalism to read; this is the one
 * block that asks the reader for something, and the design draft sets it apart
 * that way. Home was missing it entirely, which left the Mitmachen tab as the only
 * door into the callouts.
 *
 * Dark in both schemes, so everything on it is `always-light`, dimmed where the
 * light scheme used a grey. In dark mode the card no longer stands out from the
 * page by brightness — the coral button carries that job, which is what it is for.
 */
export function CalloutTeaser({
  callout,
  onPress,
}: {
  callout: Callout;
  onPress: (callout: Callout) => void;
}) {
  const style = calloutStyle(callout);

  return (
    <Pressable
      onPress={() => onPress(callout)}
      accessibilityRole="link"
      accessibilityLabel={callout.title}
      className="rounded-md bg-always-dark p-m active:opacity-90"
    >
      <Overline label={`Mitmachen · ${style.kicker}`} color="always-light" className="opacity-70" />
      <Typo variant="headline-s" color="always-light" className="mt-2xs">
        {callout.title}
      </Typo>
      <Typo variant="text-m" color="always-light" className="mt-2xs opacity-70" numberOfLines={3}>
        {callout.excerpt}
      </Typo>
      {/* Die Abblendung liegt auf der Zeile, damit Symbol und Zahl gleich weit
          zurücktreten — ein Ionicon nimmt keine Deckkraft entgegen. */}
      <View className="mt-s flex-row items-center opacity-70">
        <Ionicons name="people-outline" size={16} color={colors['always-light']} />
        <Typo variant="text-s" color="always-light" className="ml-2xs">
          {formatNumberDe(callout.responseCount)} {style.unit} bisher
        </Typo>
      </View>
      <Button
        title={style.cta}
        className="mt-s"
        onPress={() => onPress(callout)}
        accessibilityLabel={`${style.cta}: ${callout.title}`}
      />
    </Pressable>
  );
}
