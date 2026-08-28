# Third-party notices for @correctiv/mobile

This app is licensed under the **GNU Affero General Public License v3.0 or
later**, like the rest of this repository. See [`../../LICENSE`](../../LICENSE).

## Why this file is not called LICENSE

It was, once. This app was scaffolded with `create-expo-app`, whose templates are
MIT-licensed, and the template's `LICENSE` file came along with it. A bare
`LICENSE` at the root of a subtree reads as "this subtree is MIT", which is not
the case, so the file was renamed rather than deleted.

Deleting it would have been wrong too: the MIT licence requires its notice to be
retained for the portions it covers, and AGPL-3.0 permits incorporating MIT code
precisely on that condition. So the notice stays, below, in the role it actually
has: an attribution for scaffolded code, not the licence of this app.

## create-expo-app template

Portions of the initial project scaffold (Expo Router layout, `babel.config.js`,
`tsconfig` base, asset placeholders) originate from Expo's templates:

```
The MIT License (MIT)

Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts

No font file is checked in here, because the families are pulled from npm at build
time, but the build **redistributes** them, so their licences apply to what ships. The
reader's copies are additionally subsetted and base64-embedded into
`src/lib/theme/readerFonts.generated.ts` by `npm run fonts`; a subset is a
modification the OFL permits and covers.

| Font | Where it comes from | Licence |
| --- | --- | --- |
| Merriweather | `@expo-google-fonts/merriweather` | SIL Open Font License 1.1 |
| Source Sans 3 | `@expo-google-fonts/source-sans-3` | SIL Open Font License 1.1 |
| Ionicons | `@expo/vector-icons` | MIT |

The OFL permits redistribution, embedding and subsetting; it forbids selling the
fonts on their own and requires that a modified copy not carry a reserved name.
Full texts ship inside each package.
