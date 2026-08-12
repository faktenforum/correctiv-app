import { Pressable, View } from 'react-native';

import { Typo } from './Typo';

export type SectionHeaderProps = {
  title: string;
  /** Optionaler „mehr"-Link rechts. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/** Section heading with an optional action link (e.g. "Alles aus dem Backstage →"). */
export function SectionHeader({ title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <View className={['flex-row items-end justify-between', className ?? ''].join(' ')}>
      <Typo variant="headline-m">{title}</Typo>
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8} className="active:opacity-60">
          <Typo variant="text-s" color="emphasis">
            {actionLabel}
          </Typo>
        </Pressable>
      )}
    </View>
  );
}
