import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/lib/theme';

export type ThumbnailProps = {
  uri?: string | null;
  /** 16/9 for video, 1 for podcast covers. */
  aspectRatio: number;
  /** Centred over the image — the play mark, usually. */
  overlay?: ReactNode;
  /** Shown instead of the image when there is none. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  className?: string;
};

/**
 * A preview image that fails quietly.
 *
 * expo-image paints its own broken-image glyph on a black field when a thumbnail
 * cannot be loaded, and on this project that is the normal case rather than the
 * exception: three CORRECTIV hosts serve a Let's Encrypt chain that older Android
 * trust stores reject, and PeerTube thumbnails come and go. A missing image should
 * read as an empty frame, so it stays a gap in the content and not a defect in the
 * app.
 */
export function Thumbnail({
  uri,
  aspectRatio,
  overlay,
  icon = 'image-outline',
  className,
}: ThumbnailProps) {
  const [failed, setFailed] = useState(false);

  return (
    <View
      className={['overflow-hidden bg-grey-300', className ?? ''].join(' ')}
      style={{ aspectRatio }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name={icon} size={26} color={colors['grey-400']} />
        </View>
      )}
      {overlay ? (
        <View className="absolute inset-0 items-center justify-center">{overlay}</View>
      ) : null}
    </View>
  );
}
