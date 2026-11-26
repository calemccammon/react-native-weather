import type { Forecast } from '../../../domain/models/forecast';
import { allUnits, type Units } from '../../../domain/models/units';
import { asheville, day, englishWording, sampleForecast } from '../../../testing/fakes';
import { conditionIcon } from '../../core/weatherConditionUi';
import { forecastUiModelFrom } from './forecastUiModel';
import { placeUiModelFrom } from './placeUiModel';
import { unitsUiModelFrom, unitsUiModelToDomain } from './unitsUiModel';

const wording = englishWording();

/** The current conditions of a metric forecast, shown in `units`. */
const current = (forecast: Forecast, units: Units) =>
  forecastUiModelFrom(forecast, units, wording).current;

describe('current conditions', () => {
  it('are converted, rounded, worded and marked with their scale', () => {
    const imperial = current(sampleForecast(), 'imperial');

    expect(imperial.temperature).toBe('36°F');
    expect(imperial.condition).toBe('Clear');
    expect(imperial.feelsLike).toBe('Feels like 31°');
    expect(imperial.wind).toBe('Wind 4 mph');
    expect(imperial.accessibilityLabel).toBe(
      'Now: Clear, 36 degrees Fahrenheit, feels like 31, wind 4 mph',
    );

    const metric = current(sampleForecast(), 'metric');
    expect(metric.temperature).toBe('2°C');
    expect(metric.feelsLike).toBe('Feels like -1°');
    expect(metric.wind).toBe('Wind 7 km/h');
    expect(metric.accessibilityLabel).toContain('2 degrees Celsius');
  });

  it('use the night icon after dark', () => {
    const night = current(sampleForecast({ isDay: false }), 'metric');
    const daytime = current(sampleForecast(), 'metric');

    expect(night.icon).toBe(conditionIcon('clear', false));
    expect(daytime.icon).toBe(conditionIcon('clear'));
  });
});

describe('the week', () => {
  // Friday 20 November 2026, with a week running from 30 to 70 degrees.
  const model = forecastUiModelFrom(
    sampleForecast({
      days: [
        day(20, 30, 70),
        day(21, 40, 60, { chance: 21, condition: 'rain' }),
        day(22, 50, 50, { chance: 0 }),
        day(23, 70, 70),
      ],
    }),
    'metric',
    wording,
  );

  it("labels the place's own today, and the rest by weekday", () => {
    expect(model.days.map((each) => each.dayLabel)).toEqual(['Today', 'Sat', 'Sun', 'Mon']);
  });

  it('rounds temperatures and shows a chance only above zero', () => {
    expect([model.days[1]?.low, model.days[1]?.high]).toEqual(['40°', '60°']);
    expect(model.days.map((each) => each.chance)).toEqual(['', '21%', '', '']);
  });

  it("places each day's bar within the week's range", () => {
    expect(model.days.map((each) => [each.barStart, each.barEnd])).toEqual([
      [0, 1],
      [0.25, 0.75],
      [0.5, 0.5],
      [1, 1],
    ]);
  });

  it('reads each row out as a sentence', () => {
    expect(model.days[0]?.accessibilityLabel).toBe('Today: Overcast, low 30, high 70 degrees');
    expect(model.days[1]?.accessibilityLabel).toBe(
      'Saturday: Rain, low 40, high 60 degrees, 21 percent chance of precipitation',
    );
  });

  it('gives each row its date as its identity', () => {
    expect(model.days.map((each) => each.key)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
  });
});

it('converts the week to Fahrenheit, keeping each bar where it was', () => {
  const forecast = sampleForecast({ days: [day(20, 0, 10), day(21, 5, 5, { chance: 30 })] });

  const model = forecastUiModelFrom(forecast, 'imperial', wording);

  expect(model.days.map((each) => [each.low, each.high])).toEqual([
    ['32°', '50°'],
    ['41°', '41°'],
  ]);
  expect(model.days[1]?.chance).toBe('30%');
  expect(model.days.map((each) => [each.barStart, each.barEnd])).toEqual(
    forecastUiModelFrom(forecast, 'metric', wording).days.map((each) => [
      each.barStart,
      each.barEnd,
    ]),
  );
});

it('calls no other day Today when today is missing from the list', () => {
  // Measured on the 20th, but the list starts on the 21st.
  const model = forecastUiModelFrom(
    sampleForecast({ days: [day(21, 40, 60), day(22, 40, 60)] }),
    'metric',
    wording,
  );

  expect(model.days.map((each) => each.dayLabel)).toEqual(['Sat', 'Sun']);
});

it('fills every bar in a week of one temperature', () => {
  const model = forecastUiModelFrom(
    sampleForecast({ days: [day(20, 50, 50), day(21, 50, 50)] }),
    'metric',
    wording,
  );

  expect(model.days.map((each) => [each.barStart, each.barEnd])).toEqual([
    [0, 1],
    [0, 1],
  ]);
});

it('has no rows for a forecast with no days', () => {
  expect(forecastUiModelFrom(sampleForecast({ days: [] }), 'metric', wording).days).toEqual([]);
});

it('shows a place by its name, the rest of what is known, and where it is', () => {
  expect(placeUiModelFrom(asheville, wording.t)).toEqual({
    title: 'Asheville',
    subtitle: 'North Carolina, United States',
    latitude: 35.6,
    longitude: -82.55,
  });
  const somewhere = { name: 'Somewhere', latitude: 1, longitude: 2 };
  expect(placeUiModelFrom(somewhere, wording.t).subtitle).toBe('');
  expect(placeUiModelFrom({ ...somewhere, country: 'France' }, wording.t).subtitle).toBe('France');
});

it('calls a place with no name by its coordinates', () => {
  const title = (latitude: number, longitude: number) =>
    placeUiModelFrom({ latitude, longitude }, wording.t).title;

  expect(title(35.6, -82.55)).toBe('35.60°N, 82.55°W');
  expect(title(-33.87, 151.21)).toBe('33.87°S, 151.21°E');
  // Too near the equator and the meridian to show: not "0.00°S, 0.00°W".
  expect(title(-0.001, -0.004)).toBe('0.00°N, 0.00°E');
});

it('has a units choice for each system of units, and back again', () => {
  expect(unitsUiModelFrom('metric')).toBe('celsius');
  expect(unitsUiModelFrom('imperial')).toBe('fahrenheit');
  for (const units of allUnits) {
    expect(unitsUiModelToDomain(unitsUiModelFrom(units))).toBe(units);
  }
});
