import { useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { shapes, spacing } from '../../core/tokens';

/**
 * The sheet's resting heights, as fractions of the screen: tucked away, at
 * rest, and pulled up to just under the search bar.
 */
export const sheetStops = { collapsed: 0.12, resting: 0.3, expanded: 0.84 } as const;

const handle = { width: 32, height: 4, opacity: 0.4 } as const;

const stops: readonly number[] = Object.values(sheetStops);
const lowest = sheetStops.collapsed;
const highest = sheetStops.expanded;

/** A flick faster than this, in points per millisecond, moves on a stop. */
const flickVelocity = 0.5;

/** A press that travels less than this many points is a tap, not a drag. */
const tapSlop = 4;

interface BottomSheetProps {
  /** The height of the screen the sheet's stops are fractions of. */
  readonly screenHeight: number;
  /** Screen-reader names for the handle's action in each direction. */
  readonly expandLabel: string;
  readonly collapseLabel: string;
  readonly children: ReactNode;
}

/**
 * A Material 3 bottom sheet that drags by its handle between three heights.
 * Its content scrolls inside it.
 */
export function BottomSheet(props: BottomSheetProps) {
  const { screenHeight } = props;
  const theme = useTheme();

  // The sheet's height as a fraction of the screen, so a change of screen
  // height (a rotation) keeps it at the stop it was at.
  const [stop, setStop] = useState<number>(sheetStops.resting);
  const [fraction] = useState(() => new Animated.Value(sheetStops.resting));

  const settleAt = (target: number) => {
    setStop(target);
    Animated.spring(fraction, { toValue: target, useNativeDriver: false, bounciness: 0 }).start();
  };
  const expanded = stop >= highest;
  const toggle = () => settleAt(expanded ? sheetStops.resting : highest);

  const dragged = (dy: number) => Math.min(highest, Math.max(lowest, stop - dy / screenHeight));
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => fraction.setValue(dragged(gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      const tapped = Math.abs(gesture.dy) < tapSlop && Math.abs(gesture.vy) < flickVelocity;
      if (tapped) {
        toggle();
      } else {
        settleAt(nextStop(stops, dragged(gesture.dy), gesture.vy));
      }
    },
    onPanResponderTerminate: () => settleAt(stop),
  });

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: fraction.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: theme.colors.elevation.level1,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      {/* A drag moves the sheet; a tap, or a screen reader's activation,
          switches it between resting and pulled up. */}
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={expanded ? props.collapseLabel : props.expandLabel}
        onAccessibilityTap={toggle}
        style={styles.handleArea}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
      </View>
      {props.children}
    </Animated.View>
  );
}

/**
 * Where a sheet let go at `reached` (a fraction of the screen), moving at
 * `velocityY` (downwards positive), should come to rest: the next stop in the direction of a flick,
 * otherwise the nearest.
 */
export function nextStop(stops: readonly number[], reached: number, velocityY: number): number {
  if (velocityY <= -flickVelocity) {
    return stops.find((each) => each > reached) ?? stops[stops.length - 1]!;
  }
  if (velocityY >= flickVelocity) {
    return [...stops].reverse().find((each) => each < reached) ?? stops[0]!;
  }
  return stops.reduce((nearest, each) =>
    Math.abs(each - reached) < Math.abs(nearest - reached) ? each : nearest,
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: shapes.extraLarge,
    borderTopRightRadius: shapes.extraLarge,
    overflow: 'hidden',
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.md + spacing.xs,
  },
  handle: {
    width: handle.width,
    height: handle.height,
    borderRadius: handle.height / 2,
    opacity: handle.opacity,
  },
});
