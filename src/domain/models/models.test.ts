import { sampleForecast } from '../../testing/fakes';
import { isToday } from './forecast';
import { normalizeLongitude, placeFromCoordinates, placeSubtitle } from './place';
import { unitsForCountry } from './units';

describe('a place', () => {
  it('has a subtitle made of whichever parts are known', () => {
    const base = { name: 'Asheville', latitude: 35.6, longitude: -82.55 };

    expect(placeSubtitle({ ...base, region: 'North Carolina', country: 'United States' })).toBe(
      'North Carolina, United States',
    );
    expect(placeSubtitle({ ...base, country: 'United States' })).toBe('United States');
    expect(placeSubtitle(base)).toBe('');
  });

  it('picked off the map is named by its coordinates', () => {
    expect(placeFromCoordinates(35.6, -82.55).name).toBe('35.60°N, 82.55°W');
    expect(placeFromCoordinates(-33.87, 151.21).name).toBe('33.87°S, 151.21°E');
  });

  it('picked off a map dragged round the world has its longitude brought back', () => {
    const place = placeFromCoordinates(35.6, -82.55 + 360);

    expect(place.longitude).toBeCloseTo(-82.55, 9);
    expect(place.name).toBe('35.60°N, 82.55°W');
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
