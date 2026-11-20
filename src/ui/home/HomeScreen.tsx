import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeState, useHomeViewModel } from './viewModels/ViewModelsContext';
import { breakpoints, shapes, spacing } from '../core/tokens';
import { BottomSheet, sheetStops } from './components/BottomSheet';
import { ForecastPanel } from './components/ForecastPanel';
import { PlaceSearchBar } from './components/PlaceSearchBar';
import { WeatherMap } from './components/WeatherMap';
import type { MapInsets } from './components/WeatherMap.types';

const sidePanelWidth = 400;

/** Material 3's search bar height. */
const searchBarHeight = 56;

/**
 * The app's one screen: a map, a search bar over it, and the forecast for
 * the selected place.
 *
 * On a phone the forecast is a bottom sheet that drags up over the map. From
 * Material's "expanded" window width up, it is a panel at the side.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const viewModel = useHomeViewModel();
  const place = useHomeState((state) => state.place);
  const [searchOpen, setSearchOpen] = useState(false);

  const isWide = width >= breakpoints.expanded;
  const top = safeArea.top + spacing.lg;
  const underSearchBar = top + searchBarHeight + spacing.md;

  // What covers the map, so the selected place can be shown in the clear.
  // It changes when the window crosses between the two layouts (a rotated
  // phone, a resized window), and the map then moves the place again.
  const covered: MapInsets = useMemo(
    () =>
      isWide
        ? { top: 0, right: 0, bottom: 0, left: sidePanelWidth + spacing.lg * 2 }
        : { top: underSearchBar, right: 0, bottom: height * sheetStops.resting, left: 0 },
    [isWide, underSearchBar, height],
  );
  const pin = useMemo(
    () => (place === null ? null : { latitude: place.latitude, longitude: place.longitude }),
    [place],
  );

  const searchBar = (
    <PlaceSearchBar
      open={searchOpen}
      onOpenChange={setSearchOpen}
      maxResultsHeight={height * 0.5}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <WeatherMap
        pin={pin}
        covered={covered}
        dark={theme.dark}
        pinColor={theme.colors.primary}
        accessibilityLabel={t('map.label')}
        pinAccessibilityLabel={t('map.selectedPlace')}
        onLongPress={viewModel.selectPoint}
      />

      {/* The map's makers ask for their credit to stay visible. On a phone it
          sits just under the search bar, clear of the forecast sheet; on a
          wide window nothing covers the map's bottom corner. */}
      <View
        pointerEvents="none"
        style={[
          styles.credit,
          { backgroundColor: theme.colors.surface },
          isWide
            ? { bottom: safeArea.bottom + spacing.sm, right: safeArea.right + spacing.sm }
            : { top: underSearchBar, right: safeArea.right + spacing.sm },
        ]}
      >
        <Text variant="labelSmall">{t('map.credit')}</Text>
      </View>

      {!isWide && (
        <BottomSheet
          screenHeight={height}
          expandLabel={t('forecast.expand')}
          collapseLabel={t('forecast.collapse')}
        >
          {/* Clear of the system's gesture bar at the bottom of the screen. */}
          <ForecastPanel bottomPadding={safeArea.bottom} />
        </BottomSheet>
      )}

      {/* A press anywhere else closes the search results. */}
      {searchOpen && (
        <Pressable
          testID="search-scrim"
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={() => setSearchOpen(false)}
        />
      )}

      {isWide ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.sideColumn,
            { top, bottom: safeArea.bottom + spacing.lg, left: safeArea.left + spacing.lg },
          ]}
        >
          {/* The sheet's look, rounded on every corner since it floats clear
              of the window's edges. */}
          <Surface elevation={1} style={styles.sidePanel}>
            <View style={styles.sidePanelClip}>
              <ForecastPanel topPadding={spacing.xl} />
            </View>
          </Surface>
          <View style={styles.sideSearch}>{searchBar}</View>
        </View>
      ) : (
        <View
          pointerEvents="box-none"
          style={[
            styles.topSearch,
            { top, left: safeArea.left + spacing.lg, right: safeArea.right + spacing.lg },
          ]}
        >
          {searchBar}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  credit: {
    position: 'absolute',
    opacity: 0.8,
    borderRadius: shapes.extraSmall,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  topSearch: { position: 'absolute' },
  sideColumn: { position: 'absolute', width: sidePanelWidth },
  // The search bar is drawn after the panel so its results lie over it.
  sideSearch: { position: 'absolute', top: 0, left: 0, right: 0 },
  sidePanel: {
    flex: 1,
    marginTop: searchBarHeight + spacing.md,
    borderRadius: shapes.extraLarge,
  },
  sidePanelClip: { flex: 1, borderRadius: shapes.extraLarge, overflow: 'hidden' },
});
