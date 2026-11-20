import {
  asheville,
  FakeSettingsRepository,
  FakeWeatherRepository,
  sampleForecast,
} from '../../testing/fakes';
import { WeatherError } from '../repositories/weatherRepository';
import { GetForecast } from './getForecast';
import { GetUnits } from './getUnits';
import { isSearchable, SearchPlaces } from './searchPlaces';
import { SetUnits } from './setUnits';

let repository: FakeWeatherRepository;

beforeEach(() => {
  repository = new FakeWeatherRepository();
  repository.placesToReturn = [asheville];
  repository.forecastToReturn = sampleForecast();
});

describe('SearchPlaces', () => {
  it('trims the query before asking', async () => {
    await expect(new SearchPlaces(repository).execute('  ashe ')).resolves.toEqual([asheville]);
    expect(repository.searchQueries).toEqual(['ashe']);
  });

  it('answers a query too short to search with nothing, without asking', async () => {
    await expect(new SearchPlaces(repository).execute(' a ')).resolves.toEqual([]);
    expect(repository.searchQueries).toEqual([]);
  });

  it('counts a query as searchable from two characters, spaces aside', () => {
    expect(isSearchable('a')).toBe(false);
    expect(isSearchable(' a ')).toBe(false);
    expect(isSearchable('as')).toBe(true);
  });
});

describe('GetForecast', () => {
  it('asks for the place in the given units', async () => {
    await new GetForecast(repository).execute(asheville, 'imperial');

    expect(repository.forecastRequests).toEqual([
      { latitude: 35.6, longitude: -82.55, units: 'imperial' },
    ]);
  });

  it('brings a longitude from a map dragged round the world back into range', async () => {
    await new GetForecast(repository).execute({ ...asheville, longitude: -82.55 - 720 }, 'metric');

    expect(repository.forecastRequests[0]?.longitude).toBeCloseTo(-82.55, 9);
  });

  it.each([
    ['too far north', 90.5, 0],
    ['too far south', -91, 0],
    ['not a number', Number.NaN, 0],
    ['an endless longitude', 10, Number.POSITIVE_INFINITY],
    ['a longitude that is not a number', 10, Number.NaN],
  ])('refuses a point off the globe (%s) without asking', async (_, latitude, longitude) => {
    const place = { name: 'nowhere', latitude, longitude };

    await expect(new GetForecast(repository).execute(place, 'metric')).rejects.toEqual(
      new WeatherError('invalidPlace'),
    );
    expect(repository.forecastRequests).toEqual([]);
  });
});

describe('GetUnits', () => {
  it("follows the device's country until the user chooses", () => {
    const getUnits = new GetUnits(new FakeSettingsRepository());

    expect(getUnits.execute('US')).toBe('imperial');
    expect(getUnits.execute('FR')).toBe('metric');
    expect(getUnits.execute()).toBe('metric');
  });

  it("puts the user's choice before the device's country", () => {
    expect(new GetUnits(new FakeSettingsRepository('metric')).execute('US')).toBe('metric');
  });
});

describe('SetUnits', () => {
  it('saves the choice, which GetUnits then returns', async () => {
    const settings = new FakeSettingsRepository();

    await new SetUnits(settings).execute('imperial');

    expect(settings.saved).toEqual(['imperial']);
    expect(new GetUnits(settings).execute('FR')).toBe('imperial');
  });
});
