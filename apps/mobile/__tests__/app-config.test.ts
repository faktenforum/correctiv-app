import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the settings in `app.json` that only fail on a device, and only on one
 * platform, long after every check has gone green.
 *
 * `app.json` is not code. Nothing imports it, nothing typechecks it, and
 * `expo prebuild` copies its values into the native projects where no test in this
 * repo ever looks. A wrong value there is invisible until somebody picks up the
 * right phone.
 */
const config = JSON.parse(readFileSync(resolve(__dirname, '../app.json'), 'utf8')) as {
  expo: {
    userInterfaceStyle?: string;
    plugins?: (string | [string, Record<string, unknown>])[];
  };
};

/** One plugin's options, whichever of the two shapes `plugins` spells it in. */
const pluginOptions = (name: string): Record<string, unknown> | null => {
  for (const entry of config.expo.plugins ?? []) {
    if (entry === name) return {};
    if (Array.isArray(entry) && entry[0] === name) return entry[1] ?? {};
  }
  return null;
};

describe('app.json', () => {
  it('leaves the appearance to the OS', () => {
    // It was "light", which prebuild writes into ios/<name>/Info.plist as
    // `UIUserInterfaceStyle = Light`. iOS then reports light whatever the device is
    // set to, so the appearance setting on 'system' could never resolve to dark and
    // the dark palette was unreachable on that platform. Android is not affected,
    // which is why an emulator check found nothing (TROUBLESHOOTING.md → Design
    // tokens and styling). 'system' against a dark device is the app's default
    // combination, and the one that already shipped broken.
    expect(config.expo.userInterfaceStyle).toBe('automatic');
  });

  it('grants expo-video the capability its now playing notification needs', () => {
    // BOTH HALVES OR NEITHER, which is why this vector reads a `.tsx` file as text.
    //
    // `app/video.tsx` sets `showNowPlayingNotification`, and on Android that property
    // does nothing on its own: `expo-video`'s own type documentation says
    // "`supportsBackgroundPlayback` property of the config plugin has to be `true` for
    // the now playing notification to work". The plugin is also a no-op when neither of
    // its options is given, which is how it was declared — a bare `"expo-video"`.
    //
    // So the screen asking and the config granting are one fact typed in two places,
    // and either one alone is silence on the lock screen of an Android phone. Nothing
    // else in this repository would notice: `app.json` is not code, and the screen
    // renders identically either way.
    expect(pluginOptions('expo-video')).toStrictEqual({ supportsBackgroundPlayback: true });

    const screen = readFileSync(resolve(__dirname, '../src/app/video.tsx'), 'utf8');
    expect(screen).toContain('showNowPlayingNotification = true');
  });

  it('does not claim picture-in-picture it has not enabled', () => {
    // `video.tsx` sets `allowsPictureInPicture`, and the plugin option that would make
    // it work is deliberately absent — the decision is open. This pins the pair
    // together so that enabling one without the other cannot pass unnoticed in either
    // direction: PiP needs `android:supportsPictureInPicture` in the manifest, which
    // only `supportsPictureInPicture` here writes.
    expect(pluginOptions('expo-video')).not.toHaveProperty('supportsPictureInPicture');
  });
});
