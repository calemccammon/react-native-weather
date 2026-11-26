import { day, sampleForecast } from '../../testing/fakes';
import { inUnits, isToday } from './forecast';
import { normalizeLongitude, placeFromCoordinates } from './place';
import { unitsForCountry } from './units';

describe('a place', () => {
  it('picked off the map has no name', () => {
    expect(placeFromCoordinates(35.6, -82.55)).toEqual({ latitude: 35.6, longitude: -82.55 });
  });

  it('picked off a map dragged round the world has its longitude brought back', () => {
    const place = placeFromCoordinates(35.6, -82.55 + 360);

    expect(place.longitude).toBeCloseTo(-82.55, 9);
  });
});

describe('normalizeLongitude', () => {
  it.each([
    [0, 0],
    [179, 179],
    [180, -180],
    [-180, -180],
    [190, -170],
    [-190, 170],
    [360, 0],
    [725, 5],
    [-725, -5],
  ])('brings %d to %d', (longitude, expected) => {
    expect(normalizeLongitude(longitude)).toBeCloseTo(expected, 9);
  });
});

describe('units', () => {
  it('are imperial in the three countries that use them, and metric elsewhere', () => {
    expect(['US', 'LR', 'MM'].map(unitsForCountry)).toEqual(['imperial', 'imperial', 'imperial']);
    expect(unitsForCountry('GB')).toBe('metric');
    expect(unitsForCountry(null)).toBe('metric');
    expect(unitsForCountry(undefined)).toBe('metric');
  });
});

describe('a forecast', () => {
  it("knows which day is the place's own today", () => {
    const forecast = sampleForecast({ observedAt: '2026-11-21T23:30' });

    expect(forecast.days.map((each) => isToday(forecast, each))).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('is the same forecast in metric units', () => {
    const forecast = sampleForecast();

    expect(inUnits(forecast, 'metric')).toBe(forecast);
  });

  it('has its temperatures in Fahrenheit and its wind in miles an hour in imperial units', () => {
    const forecast = sampleForecast({ days: [day(20, 0, 10, { chance: 40 }), day(21, -40, 37)] });
    const metricCurrent = { ...forecast.current, temperature: 10, feelsLike: -40, windSpeed: 20 };

    const imperial = inUnits({ ...forecast, current: metricCurrent }, 'imperial');

    expect(imperial.current.temperature).toBeCloseTo(50, 9);
    expect(imperial.current.feelsLike).toBeCloseTo(-40, 9);
    expect(imperial.current.windSpeed).toBeCloseTo(12.427, 3);
    expect(imperial.days.map((each) => [each.low, each.high])).toEqual([
      [32, 50],
      [-40, expect.closeTo(98.6, 9)],
    ]);
  });

  it('keeps everything but temperatures and wind speed as it was', () => {
    const forecast = sampleForecast({ days: [day(20, 0, 10, { chance: 40, condition: 'rain' })] });

    const imperial = inUnits(forecast, 'imperial');

    expect({ ...imperial.current, temperature: 0, feelsLike: 0, windSpeed: 0 }).toEqual({
      ...forecast.current,
      temperature: 0,
      feelsLike: 0,
      windSpeed: 0,
    });
    expect(imperial.days[0]).toEqual({ ...forecast.days[0], low: 32, high: 50 });
  });
});
