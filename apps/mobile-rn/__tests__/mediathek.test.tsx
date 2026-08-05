import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { bonusMedia } from '@correctiv/app-core/data/backstage';
import { PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import type { PodcastSeries } from '@correctiv/app-core/data/podcasts';

/**
 * The Mediathek's one irreversible decision: who hears the whole thing.
 *
 * Club bonus audio is a 60-second invitation for guests and a full episode for
 * members, and the difference is one boolean read at tap time. Get it wrong in
 * the guest direction and the demo gives away the club; wrong the other way and
 * the invitation never appears. Neither shows up in a typecheck.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/audio/player', () => ({
  playEpisode: jest.fn(() => Promise.resolve()),
  playPreview: jest.fn(() => Promise.resolve()),
  playRadio: jest.fn(() => Promise.resolve()),
  togglePlay: jest.fn(),
  stop: jest.fn(),
  audioStore: { getState: jest.fn(), setState: jest.fn(), subscribe: jest.fn(() => jest.fn()) },
}));
jest.mock('@/lib/audio/useAudio', () => ({
  useAudio: () => ({
    track: null,
    status: 'idle',
    positionSec: 0,
    durationSec: 0,
    speed: 1,
    previewEnded: false,
    errorMessage: null,
  }),
  useEpisodeStatus: () => 'off',
  useRadioState: () => 'off',
}));

// The icon font loads asynchronously and setStates after the test ends.
jest.mock('@expo/vector-icons', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Ionicons = ({ name }: { name: string }) => react.createElement(Text, null, `icon:${name}`);
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
});

import { router } from 'expo-router';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import MediathekScreen from '@/app/(tabs)/mediathek';
import { playEpisode, playPreview } from '@/lib/audio/player';
import { coreStores } from '@/lib/store/core';

const push = router.push as jest.Mock;
const playEpisodeMock = playEpisode as jest.Mock;
const playPreviewMock = playPreview as jest.Mock;

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 402, height: 760 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const initialMembership = coreStores.membership.getState();
const initialPodcasts = coreStores.podcasts.getState();
const initialMedia = coreStores.media.getState();

const SERIES: PodcastSeries = {
  id: PODCAST_CHANNELS[0],
  title: 'Pausenbrot',
  publisher: 'Salon5',
  description: 'Der Nachrichten-Snack.',
  imageUrl: null,
  episodes: [
    {
      id: 'ep-1',
      title: 'Erste Folge',
      date: '2026-06-11T06:00:00.000Z',
      durationLabel: '9 Min.',
      audio: 'https://salon5.correctiv.net/pausenbrot/1.mp3',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStores.membership.setState(initialMembership, true);
    // Everything starts 'ready', or the screen's lazy loaders fire real network
    // requests on mount — which is both slow and a source of stray console noise
    // from the store's error path.
    coreStores.media.setState(
      {
        ...initialMedia,
        byKey: {
          gespraech: { videos: [], status: 'ready' },
          funfacts: { videos: [], status: 'ready' },
          hauptkanal: { videos: [], status: 'ready' },
        },
      },
      true,
    );
    coreStores.podcasts.setState({ ...initialPodcasts, series: [SERIES], status: 'ready' }, true);
  });
});

const mounted: ReactTestRenderer[] = [];
afterEach(() => {
  act(() => {
    for (const tree of mounted) tree.unmount();
  });
  mounted.length = 0;
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <MediathekScreen />
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree);
  return tree;
}

function renderedText(tree: ReactTestRenderer): string {
  const walk = (node: unknown): string[] => {
    if (typeof node === 'string') return [node];
    if (Array.isArray(node)) return node.flatMap(walk);
    if (node && typeof node === 'object' && 'children' in node) {
      return walk((node as { children: unknown }).children);
    }
    return [];
  };
  return walk(tree.toJSON()).join('\n');
}

/** Presses a Pressable by its accessibility label. */
function press(tree: ReactTestRenderer, label: string): void {
  const node = tree.root.find(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  );
  act(() => {
    node.props.onPress();
  });
}

const BONUS = bonusMedia[0];

describe('Mediathek', () => {
  it('offers radio, podcasts and the club bonus', () => {
    const text = renderedText(render());
    expect(text).toContain('Salon5 Radio');
    expect(text).toContain('Pausenbrot');
    expect(text).toContain(BONUS.title);
  });

  it('opens a series page rather than playing the whole show', () => {
    press(render(), 'Pausenbrot');
    expect(push).toHaveBeenCalledWith({
      pathname: '/serie/[id]',
      params: { id: PODCAST_CHANNELS[0] },
    });
  });

  it('says so when a video channel cannot be reached', () => {
    act(() => {
      coreStores.media.setState({
        byKey: {
          ...coreStores.media.getState().byKey,
          gespraech: { videos: [], status: 'error' },
        },
      });
    });
    expect(renderedText(render())).toContain('Videos derzeit nicht erreichbar');
  });
});

describe('the club bonus gate', () => {
  it('gives a guest 60 seconds, and says so before the tap', () => {
    const tree = render();
    expect(renderedText(tree)).toContain('60 Sek. anspielen');

    press(tree, `${BONUS.title} abspielen`);

    expect(playPreviewMock).toHaveBeenCalledTimes(1);
    expect(playEpisodeMock).not.toHaveBeenCalled();
    expect(playPreviewMock.mock.calls[0][0]).toMatchObject({
      episodeId: BONUS.id,
      url: BONUS.source,
    });
  });

  it('gives a member the full episode, with no preview note', () => {
    act(() => {
      coreStores.membership.getState().join(10, 'monatlich', 'Test');
    });
    const tree = render();

    expect(renderedText(tree)).not.toContain('60 Sek. anspielen');
    press(tree, `${BONUS.title} abspielen`);

    expect(playEpisodeMock).toHaveBeenCalledTimes(1);
    expect(playPreviewMock).not.toHaveBeenCalled();
  });

  it('keeps the club badge either way', () => {
    // The badge is the invitation's label, not a lock — it stays for members too.
    expect(renderedText(render())).toContain('CLUB');
    act(() => {
      coreStores.membership.getState().join(10, 'monatlich', 'Test');
    });
    expect(renderedText(render())).toContain('CLUB');
  });
});
