import { sampleForecast } from '../../testing/fakes';
import { isToday } from './forecast';
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
});
