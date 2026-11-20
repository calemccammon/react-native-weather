import { MD3LightTheme } from 'react-native-paper';

import { appTheme } from './theme';

const hexColor = /^#[0-9a-f]{6}$/;

it('generates its colours from the seed, not from the stock theme', () => {
  const light = appTheme(false);

  expect(light.colors.primary).toMatch(hexColor);
  expect(light.colors.primary).not.toBe(MD3LightTheme.colors.primary);
  // The seed is a blue: more blue than red in the primary colour.
  const [red, blue] = [light.colors.primary.slice(1, 3), light.colors.primary.slice(5, 7)];
  expect(parseInt(blue, 16)).toBeGreaterThan(parseInt(red, 16));
});

it('has a dark variant with a dark surface and its own primary colour', () => {
  const [light, dark] = [appTheme(false), appTheme(true)];
  const brightness = (hex: string) => parseInt(hex.slice(1, 3), 16);

  expect(dark.dark).toBe(true);
  expect(light.dark).toBe(false);
  expect(brightness(dark.colors.surface)).toBeLessThan(brightness(light.colors.surface));
  expect(dark.colors.primary).not.toBe(light.colors.primary);
});

it('tints raised surfaces a step at a time', () => {
  const { elevation, surface } = appTheme(false).colors;
  const levels = [elevation.level1, elevation.level2, elevation.level3, elevation.level5];

  expect(new Set([surface, ...levels]).size).toBe(levels.length + 1);
  expect(levels.every((level) => hexColor.test(level))).toBe(true);
});
