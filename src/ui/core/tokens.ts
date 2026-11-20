/**
 * The app's own design tokens: the numbers Material 3 leaves to the app.
 * Colours and type come from the theme in `theme.ts`.
 */

/** Material's 4-point spacing scale. */
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Material 3's corner-radius scale, as far as the app uses it. */
export const shapes = { extraSmall: 4, medium: 12, extraLarge: 28 } as const;

/** Window widths at which the layout changes. */
export const breakpoints = {
  /** Material's "expanded" window class: room for a panel beside the map. */
  expanded: 840,
} as const;

/** The colour the whole palette is generated from. */
export const seedColor = '#2E6FB7';
