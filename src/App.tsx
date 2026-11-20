import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAsync } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AppContainer } from './di/buildContainer';
import { createContainer } from './di/container';
import { appTheme } from './ui/core/theme';
import { HomeScreen } from './ui/home/HomeScreen';
import { ViewModelsProvider } from './ui/home/viewModels/ViewModelsContext';

/**
 * Opens what the app needs before it can draw (the saved settings and the
 * icon font), then shows the home screen inside the theme and the wording.
 */
export function App() {
  const dark = useColorScheme() === 'dark';
  const theme = useMemo(() => appTheme(dark), [dark]);
  const [container, setContainer] = useState<AppContainer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: AppContainer | undefined;
    void (async () => {
      [created] = await Promise.all([
        createContainer(),
        // Without its font an icon is an empty box; a failure to load it
        // should not keep the app from starting.
        loadAsync(MaterialCommunityIcons.font).catch(() => undefined),
      ]);
      if (cancelled) {
        created.dispose();
      } else {
        setContainer(created);
      }
    })();
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, []);

  if (container === null) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <I18nextProvider i18n={container.i18n}>
          <ViewModelsProvider viewModels={container}>
            <HomeScreen />
            <StatusBar style={dark ? 'light' : 'dark'} />
          </ViewModelsProvider>
        </I18nextProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
