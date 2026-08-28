import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from './SafeAreaView';

export type ScreenProps = {
  children: ReactNode;
  /** Scrollender Inhalt (Default) oder fester Bildschirm. */
  scroll?: boolean;
  /** Drop the default horizontal padding (px-m) — for edge-to-edge lists and heroes. */
  noPadding?: boolean;
  className?: string;
};

/** The screen scaffold: page surface, top safe area, optionally scrolling. */
export function Screen({ children, scroll = true, noPadding = false, className }: ScreenProps) {
  const pad = noPadding ? '' : 'px-m';
  if (scroll) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-grey-100">
        <ScrollView
          className="flex-1"
          contentContainerClassName={[pad, 'pt-m pb-2xl', className ?? ''].join(' ')}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-grey-100">
      <View className={['flex-1', pad, className ?? ''].join(' ')}>{children}</View>
    </SafeAreaView>
  );
}
