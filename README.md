# react-native-weather

A weather app in React Native (Expo): search for a place, see its forecast.
One of three builds of the same app, alongside
[flutter-weather](https://github.com/calemccammon/flutter-weather) and
[kmp-weather](https://github.com/calemccammon/kmp-weather), to compare the
frameworks.

The repository holds the project set-up only. `App.tsx` is the
`create-expo-app` blank TypeScript starter; the app is still to be written.
The work is laid out as [milestones](../../milestones) and
[issues](../../issues).

## Data

- Place search and forecasts: [Open-Meteo](https://open-meteo.com/) (no key;
  free for non-commercial use; CC BY 4.0, attribution required).
- Map tiles (map milestone): [OpenFreeMap](https://openfreemap.org/) styles
  over OpenStreetMap data, drawn with MapLibre. No key.

## Libraries already added

| Purpose | Package |
| --- | --- |
| Navigation | `@react-navigation/native`, `@react-navigation/native-stack` |
| Server data and caching | `@tanstack/react-query` |
| App state | `zustand` |
| Saved places and settings | `@react-native-async-storage/async-storage` |
| Device location | `expo-location` |
| Map | `@maplibre/maplibre-react-native` |
| Tests | `jest`, `jest-expo`, `@testing-library/react-native` |
| Lint | `eslint`, `eslint-config-expo` |

Any of these can be swapped; nothing depends on them yet. Add packages with
`npx expo install <name>` so versions match the Expo SDK (58).

## Running

MapLibre contains native code, so the app runs as a development build, not in
Expo Go. The `android/` and `ios/` folders are generated and not committed.

```sh
npm install
npm run android        # builds and installs the dev build, then starts Metro
npm run web            # the app in a browser, through react-native-web
npm run build:web      # static site in dist/
npm start              # later runs: Metro only, reusing the installed build
npm run lint
npm run typecheck
npm test
```

Start the emulator first with `emulator -avd Pixel_API_36`, or from Android
Studio's Device Manager. iOS builds need a Mac.

Targets: Android, iOS and web. `@maplibre/maplibre-react-native` does not
render on web, so the map needs a web version there (see the map issues).

## CI

`.github/workflows/ci.yml` runs lint, typecheck and Jest on pushes to `main`
and on pull requests. On `main` (and on demand from the Actions tab) it also
builds the Android debug APK and uploads it as a workflow artifact. The web
build runs every time.

## GitHub Pages

`.github/workflows/pages.yml` builds the web app and publishes it to
`https://calemccammon.github.io/react-native-weather/`. It runs only when started by hand
from the Actions tab. On the free plan Pages needs a public repository, so it
will fail until this one is public. The
base path `/react-native-weather` is set in `app.json` (`experiments.baseUrl`).
