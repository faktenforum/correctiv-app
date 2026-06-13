// Eigener Entry-Point: zuerst expo-router, dann den RNTP-Playback-Service
// registrieren (Standard-Pattern für react-native-track-player + expo-router).
import 'expo-router/entry';

import TrackPlayer from 'react-native-track-player';

TrackPlayer.registerPlaybackService(() => require('./src/lib/audio/playbackService').default);
