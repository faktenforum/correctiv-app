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
  expo: { userInterfaceStyle?: string };
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
});
