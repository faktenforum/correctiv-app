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
 * block that asks the reader for something, and both the draft and the
 * NativeScript build set it apart that way. Home was missing it entirely, which
 * left the Mitmachen tab as the only door into the callouts.
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
      className="rounded-md bg-grey-700 p-m active:opacity-90"
    >
      <Overline label={`Mitmachen · ${style.kicker}`} color="grey-400" />
      <Typo variant="headline-s" color="grey-100" className="mt-2xs">
        {callout.title}
      </Typo>
      <Typo variant="text-m" color="grey-400" className="mt-2xs" numberOfLines={3}>
        {callout.excerpt}
      </Typo>
      <View className="mt-s flex-row items-center">
        <Ionicons name="people-outline" size={16} color={colors['grey-400']} />
        <Typo variant="text-s" color="grey-400" className="ml-2xs">
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
