import { Platform, Switch, View } from 'react-native';

import { Typo } from '@/components/ui';
import { colors, useColors } from '@/lib/theme';

/**
 * react-native-web applies `thumbColor` to the OFF state only; the ON thumb comes
 * from its own `activeThumbColor`, which defaults to Material teal `#009688`
 * (exports/Switch/index.js). So every enabled switch showed a green thumb in the
 * browser — a colour the palette does not contain — while the emulator, where
 * `thumbColor` covers both states, looked correct. Web-only, hence invisible to
 * every screenshot of this screen taken so far.
 *
 * The prop is not in RN's `SwitchProps`; spreading it from a variable keeps that
 * off the native branch instead of casting the type away.
 */
const WEB_THUMB = Platform.OS === 'web' ? { activeThumbColor: colors['always-light'] } : {};

/**
 * A settings row: label, explanation, switch.
 *
 * `Switch` from react-native rather than the one from `@expo/ui`: that one is native
 * (SwiftUI/Compose) and would disappear on web — the same trade-off as the player's
 * progress bar.
 */
export function SettingRow({
  label,
  description,
  value,
  onValueChange,
  className,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}) {
  const palette = useColors();
  return (
    <View className={['flex-row items-center py-2xs', className ?? ''].join(' ')}>
      <View className="flex-1 pr-s">
        <Typo variant="text-m">{label}</Typo>
        {description ? (
          <Typo variant="text-s" color="grey-500" className="mt-4xs">
            {description}
          </Typo>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        // The track is a SURFACE and follows the scheme; the thumb stays white — in
        // both states it sits on a coloured or light track.
        //
        // Deliberately still `grey-300`, one of the three deprecated aliases ADR 0022
        // lists as having no semantic successor. ADR 0022 moved it to `stroke` along
        // with the app's borders, and that was wrong: `stroke` names "linear elements
        // — borders, dividers, line iconography — that provide structure without
        // competing with content", and a switch track is none of those. It is a
        // control's own state surface, which is why its other state is `accent`. The
        // line above already said "surface" and the change contradicted it.
        //
        // `grey-300` as a FILL is exactly the gap ADR 0022's table names, alongside the
        // Thumbnail placeholder and the reader's neutral verdict plaque. Leave it here
        // until upstream grows a token for it, rather than borrowing the nearest one.
        trackColor={{ false: palette['grey-300'], true: palette.accent }}
        thumbColor={colors['always-light']}
        {...WEB_THUMB}
      />
    </View>
  );
}
