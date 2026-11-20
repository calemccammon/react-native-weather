import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Icon, ProgressBar, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { useHomeState, useHomeViewModel } from '../viewModels/ViewModelsContext';
import { iconSizes, minTouchTarget, shapes, spacing } from '../../core/tokens';
import type { CurrentUiModel, DayUiModel, ForecastUiModel } from '../models/forecastUiModel';
import type { UnitsUiModel } from '../models/unitsUiModel';
import { Message } from './Message';

/**
 * Current conditions and the week ahead for the selected place. It scrolls,
 * so it can live inside the bottom sheet or the side panel.
 */
export function ForecastPanel(props: { topPadding?: number; bottomPadding?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const viewModel = useHomeViewModel();
  const place = useHomeState((state) => state.place);
  const forecast = useHomeState((state) => state.forecast);
  const units = useHomeState((state) => state.units);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: props.topPadding ?? 0,
          paddingBottom: spacing.xl + (props.bottomPadding ?? 0),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {place !== null && (
        <View style={styles.heading}>
          <Text variant="headlineSmall" accessibilityRole="header">
            {place.title}
          </Text>
          {place.subtitle !== '' && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {place.subtitle}
            </Text>
          )}
        </View>
      )}

      {/* What is happening is read out as it changes: loading, then failed. */}
      {forecast.kind !== 'loaded' && (
        <View testID="forecast-status" aria-live="polite" style={styles.status}>
          {forecast.kind === 'idle' && (
            <Message icon="gesture-tap-hold" tone="hint" text={t('forecast.hint')} />
          )}

          {forecast.kind === 'loading' && (
            <View style={styles.loading} accessible accessibilityLabel={t('forecast.loading')}>
              <ProgressBar indeterminate />
            </View>
          )}

          {forecast.kind === 'failed' && (
            <>
              <Message icon="cloud-off-outline" tone="error" text={forecast.message} />
              <Button mode="contained-tonal" icon="refresh" onPress={viewModel.retryForecast}>
                {t('tryAgain')}
              </Button>
            </>
          )}
        </View>
      )}

      {forecast.kind === 'loaded' && (
        <Loaded forecast={forecast.forecast} units={units} onUnitsChange={viewModel.setUnits} />
      )}
    </ScrollView>
  );
}

function Loaded(props: {
  forecast: ForecastUiModel;
  units: UnitsUiModel;
  onUnitsChange: (units: UnitsUiModel) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <Current current={props.forecast.current} />

      {/* The units choice drops below the heading when the text is too large
          for both on one line. */}
      <View style={styles.weekHeading}>
        <Text variant="titleMedium" accessibilityRole="header" style={styles.weekTitle}>
          {t('forecast.thisWeek')}
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('units.label')}>
          <SegmentedButtons
            style={styles.units}
            value={props.units}
            onValueChange={(value) => props.onUnitsChange(value as UnitsUiModel)}
            buttons={[
              {
                value: 'celsius' satisfies UnitsUiModel,
                label: t('units.celsius'),
                labelStyle: styles.unitsLabel,
                accessibilityLabel: t('units.celsiusName'),
              },
              {
                value: 'fahrenheit' satisfies UnitsUiModel,
                label: t('units.fahrenheit'),
                labelStyle: styles.unitsLabel,
                accessibilityLabel: t('units.fahrenheitName'),
              },
            ]}
          />
        </View>
      </View>

      <Week days={props.forecast.days} />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('forecast.credit')}
      </Text>
    </>
  );
}

function Current({ current }: { current: CurrentUiModel }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    // Wraps onto a second line when the text is too large for one.
    <View style={styles.current} accessible accessibilityLabel={current.accessibilityLabel}>
      <View style={styles.currentTemperature}>
        <Icon source={current.icon} size={iconSizes.current} color={theme.colors.primary} />
        <Text variant="displayMedium">{current.temperature}</Text>
      </View>
      <View>
        <Text variant="titleMedium">{current.condition}</Text>
        <Text variant="bodyMedium" style={muted}>
          {current.feelsLike}
        </Text>
        <Text variant="bodyMedium" style={muted}>
          {current.wind}
        </Text>
      </View>
    </View>
  );
}

function Week({ days }: { days: readonly DayUiModel[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);

  if (days.length === 0) return <Text variant="bodyMedium">{t('forecast.noDays')}</Text>;

  // Column widths grow with the user's text size, so nothing wraps. The
  // range bar is dropped when it would be too short to read.
  const columns = {
    day: dayColumn.day * fontScale,
    chance: dayColumn.chance * fontScale,
    temperature: dayColumn.temperature * fontScale,
  };
  const fixedWidth =
    spacing.lg * 2 +
    columns.day +
    iconSizes.row +
    columns.chance +
    columns.temperature * 2 +
    spacing.sm +
    spacing.md;
  const showBar = width - fixedWidth >= minBarWidth;

  return (
    <View
      style={[styles.week, { backgroundColor: theme.colors.surfaceVariant }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {days.map((day) => (
        <DayRow key={day.key} day={day} columns={columns} showBar={showBar} />
      ))}
    </View>
  );
}

function DayRow(props: {
  day: DayUiModel;
  columns: { day: number; chance: number; temperature: number };
  showBar: boolean;
}) {
  const { day, columns } = props;
  const theme = useTheme();

  return (
    <View style={styles.dayRow} accessible accessibilityLabel={day.accessibilityLabel}>
      <Text variant="bodyLarge" numberOfLines={1} style={{ width: columns.day }}>
        {day.dayLabel}
      </Text>
      <Icon source={day.icon} size={iconSizes.row} color={theme.colors.primary} />
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={[styles.centered, { width: columns.chance, color: theme.colors.tertiary }]}
      >
        {day.chance}
      </Text>
      <Text
        variant="bodyLarge"
        numberOfLines={1}
        style={[
          styles.endAligned,
          { width: columns.temperature, color: theme.colors.onSurfaceVariant },
        ]}
      >
        {day.low}
      </Text>
      {props.showBar ? (
        <RangeBar start={day.barStart} end={day.barEnd} />
      ) : (
        <View style={styles.fill} />
      )}
      <Text
        variant="bodyLarge"
        numberOfLines={1}
        style={[styles.endAligned, { width: columns.temperature }]}
      >
        {day.high}
      </Text>
    </View>
  );
}

/**
 * A track for the week's whole temperature range with one day's part of it
 * filled in, from `start` to `end` (each 0 to 1).
 */
function RangeBar({ start, end }: { start: number; end: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  // Never thinner than the bar is tall, or a day whose low and high match
  // would vanish; and never pushed off the end of the track.
  const fill = Math.min(width, Math.max(barThickness, width * (end - start)));
  const left = Math.max(0, Math.min(width * start, width - fill));

  return (
    <View
      style={[styles.barTrack, { backgroundColor: theme.colors.surface }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View
        style={[styles.barFill, { left, width: fill, backgroundColor: theme.colors.primary }]}
      />
    </View>
  );
}

/** Column widths at the default text size: room for "Today", "100%" and "-88°". */
const dayColumn = { day: 56, chance: 44, temperature: 36 } as const;

const barThickness = 6;

/** How high react-native-paper draws a segmented button. */
const paperSegmentHeight = 40;

/** The range bar is dropped when it would be shorter than this. */
const minBarWidth = 24;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  heading: { gap: spacing.xxs },
  fill: { flex: 1 },
  centered: { textAlign: 'center' },
  endAligned: { textAlign: 'right' },
  loading: { alignSelf: 'stretch', paddingVertical: spacing.xl },
  status: { alignItems: 'flex-start', gap: spacing.lg },
  current: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  currentTemperature: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  weekHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
    marginTop: spacing.sm,
  },
  // Takes the room the units choice leaves. Sized to exactly its own words,
  // Android rounds the width down and drops the last word.
  weekTitle: { flexGrow: 1, flexShrink: 0 },
  // Room for two of Paper's segments at their least width.
  units: { width: 160 },
  // Paper's segment is 40 points high and cannot be given a larger touch
  // area than it draws, so the label is padded up to the 48 Material asks for.
  unitsLabel: { marginVertical: (minTouchTarget - paperSegmentHeight) / 2 },
  week: {
    borderRadius: shapes.medium,
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: barThickness,
    borderRadius: barThickness / 2,
    marginLeft: spacing.sm,
    marginRight: spacing.md,
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: barThickness / 2,
  },
});
