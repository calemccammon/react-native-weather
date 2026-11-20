import type { Units } from '../../../domain/models/units';
import { WeatherError } from '../../../domain/repositories/weatherRepository';
import { GetForecast } from '../../../domain/useCases/getForecast';
import { GetUnits } from '../../../domain/useCases/getUnits';
import { SetUnits } from '../../../domain/useCases/setUnits';
import { createI18n } from '../../../l10n/i18n';
import {
  asheville,
  ashford,
  FakeSettingsRepository,
  FakeWeatherRepository,
  sampleForecast,
  settle,
} from '../../../testing/fakes';
import type { ForecastState } from '../models/homeState';
import { placeUiModelFrom } from '../models/placeUiModel';
import { HomeViewModel } from './homeViewModel';

let repository: FakeWeatherRepository;
let settings: FakeSettingsRepository;
let viewModel: HomeViewModel;

const i18n = createI18n(['en']);
// Stands in for a second language: English, but for the words the tests look at.
i18n.addResourceBundle(
  'xx',
  'translation',
  { today: 'Heute', failure: { timeout: 'Zu langsam.' } },
  true,
);

/** A view model over the fakes, with `saved` units and the device set to France. */
function viewModelWith(saved: Units | null): HomeViewModel {
  repository = new FakeWeatherRepository();
  settings = new FakeSettingsRepository(saved);
  return new HomeViewModel({
    getForecast: new GetForecast(repository),
    getUnits: new GetUnits(settings),
    setUnits: new SetUnits(settings),
    wording: () => ({ t: i18n.t, language: i18n.language }),
    deviceCountry: 'FR',
  });
}

const state = () => viewModel.store.getState();
const temperature = (forecast: ForecastState) =>
  forecast.kind === 'loaded' ? forecast.forecast.current.temperature : undefined;
const message = (forecast: ForecastState) =>
  forecast.kind === 'failed' ? forecast.message : undefined;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  viewModel = viewModelWith('imperial');
});

it('starts with no place and nothing to forecast', () => {
  expect(state().place).toBeNull();
  expect(state().forecast).toEqual({ kind: 'idle' });
});

it('shows a selected place at once, then its forecast', async () => {
  viewModel.select(asheville);

  expect(state().place).toEqual(placeUiModelFrom(asheville));
  expect(state().forecast).toEqual({ kind: 'loading' });
  expect(repository.forecastRequests).toEqual([
    { latitude: 35.6, longitude: -82.55, units: 'imperial' },
  ]);

  repository.forecasts[0]?.resolve(sampleForecast());
  await settle();

  expect(temperature(state().forecast)).toBe('36°F');
});

it('selects a point picked on the map by its coordinates', () => {
  viewModel.selectPoint(35.6, -82.55 + 360);

  expect(state().place?.title).toBe('35.60°N, 82.55°W');
  expect(repository.forecastRequests[0]?.longitude).toBeCloseTo(-82.55, 9);
});

it('says why a forecast failed, and shows the wait when asked to try again', async () => {
  viewModel.select(asheville);
  repository.forecasts[0]?.reject(new WeatherError('timeout'));
  await settle();

  expect(message(state().forecast)).toBe('The weather service took too long to answer.');

  viewModel.retryForecast();
  expect(state().forecast).toEqual({ kind: 'loading' });
  expect(state().place).toEqual(placeUiModelFrom(asheville));

  repository.forecasts[1]?.resolve(sampleForecast());
  await settle();
  expect(state().forecast.kind).toBe('loaded');
});

it('ends the wait on a failure nobody planned for', async () => {
  viewModel.select(asheville);
  repository.forecasts[0]?.reject(new TypeError('unplanned'));
  await settle();

  expect(message(state().forecast)).toBe('Something went wrong. Please try again.');
});

it('fails a place off the globe without asking the repository', async () => {
  viewModel.selectPoint(123, 0);
  await settle();

  expect(message(state().forecast)).toBe('That point is not on the map.');
  expect(repository.forecastRequests).toEqual([]);
});

it("does not let an earlier place's forecast replace a later place's", async () => {
  viewModel.select(asheville);
  viewModel.select(ashford);

  // The later place answers first, the earlier one after it.
  repository.forecasts[1]?.resolve(sampleForecast());
  await settle();
  repository.forecasts[0]?.reject(new WeatherError('timeout'));
  await settle();

  expect(state().place).toEqual(placeUiModelFrom(ashford));
  expect(state().forecast.kind).toBe('loaded');
});

it('drops the place when cleared, and a late forecast does not bring it back', async () => {
  viewModel.select(asheville);
  viewModel.clear();
  repository.forecasts[0]?.resolve(sampleForecast());
  await settle();

  expect(state().place).toBeNull();
  expect(state().forecast).toEqual({ kind: 'idle' });

  viewModel.retryForecast();
  expect(repository.forecasts).toHaveLength(1);
});

it('words what is on screen again when the language changes, without asking again', async () => {
  viewModel.select(asheville);
  repository.forecasts[0]?.resolve(sampleForecast());
  await settle();
  const firstDay = () => {
    const { forecast } = state();
    return forecast.kind === 'loaded' ? forecast.forecast.days[0]?.dayLabel : undefined;
  };
  expect(firstDay()).toBe('Today');

  await i18n.changeLanguage('xx');
  viewModel.reword();

  expect(firstDay()).toBe('Heute');
  expect(repository.forecasts).toHaveLength(1);

  viewModel.retryForecast();
  repository.forecasts[1]?.reject(new WeatherError('timeout'));
  await settle();
  expect(message(state().forecast)).toBe('Zu langsam.');

  await i18n.changeLanguage('en');
  viewModel.reword();
  expect(message(state().forecast)).toBe('The weather service took too long to answer.');
});

describe('units', () => {
  it("start from the user's saved choice", () => {
    expect(state().units).toBe('fahrenheit');
  });

  it("start from the device's country when nothing is saved", () => {
    // The device is set to France.
    expect(viewModelWith(null).store.getState().units).toBe('celsius');
  });

  it('are saved when changed, and the forecast is asked for again in the new ones', async () => {
    viewModel.select(asheville);
    repository.forecasts[0]?.resolve(sampleForecast());
    await settle();

    viewModel.setUnits('celsius');

    expect(state().units).toBe('celsius');
    expect(state().forecast).toEqual({ kind: 'loading' });
    expect(repository.forecastRequests[1]?.units).toBe('metric');
    expect(settings.saved).toEqual(['metric']);

    repository.forecasts[1]?.resolve(sampleForecast());
    await settle();
    expect(temperature(state().forecast)).toBe('36°C');
  });

  it('do nothing when the ones already in use are chosen', async () => {
    viewModel.select(asheville);
    repository.forecasts[0]?.resolve(sampleForecast());
    await settle();

    viewModel.setUnits('fahrenheit');

    expect(state().forecast.kind).toBe('loaded');
    expect(repository.forecasts).toHaveLength(1);
    expect(settings.saved).toEqual([]);
  });

  it('change on their own when no place is selected', () => {
    viewModel.setUnits('celsius');

    expect(state().units).toBe('celsius');
    expect(state().forecast).toEqual({ kind: 'idle' });
    expect(repository.forecastRequests).toEqual([]);

    viewModel.select(asheville);
    expect(repository.forecastRequests[0]?.units).toBe('metric');
  });

  it('still apply when the choice could not be saved', async () => {
    settings.failure = new Error('disk full');

    viewModel.setUnits('celsius');
    await settle();

    expect(state().units).toBe('celsius');
  });

  it('do not let a forecast in the old ones replace one in the new', async () => {
    viewModel.select(asheville);
    viewModel.setUnits('celsius');

    repository.forecasts[1]?.resolve(sampleForecast());
    await settle();
    repository.forecasts[0]?.resolve(sampleForecast());
    await settle();

    expect(temperature(state().forecast)).toBe('36°C');
  });
});
