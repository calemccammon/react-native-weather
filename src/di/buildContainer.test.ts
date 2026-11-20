import { createI18n } from '../l10n/i18n';
import {
  asheville,
  FakeSettingsRepository,
  FakeWeatherRepository,
  sampleForecast,
  settle,
} from '../testing/fakes';
import { buildContainer } from './buildContainer';

async function containerShowingAForecast() {
  const weatherRepository = new FakeWeatherRepository();
  weatherRepository.forecastToReturn = sampleForecast();
  const i18n = createI18n(['en']);
  // Stands in for a second language: English, but for the word the tests look at.
  i18n.addResourceBundle('xx', 'translation', { today: 'Heute' }, true);
  const container = buildContainer({
    weatherRepository,
    settingsRepository: new FakeSettingsRepository('metric'),
    i18n,
  });
  container.homeViewModel.select(asheville);
  await settle();
  return container;
}

function firstDay(container: Awaited<ReturnType<typeof containerShowingAForecast>>) {
  const { forecast } = container.homeViewModel.store.getState();
  return forecast.kind === 'loaded' ? forecast.forecast.days[0]?.dayLabel : undefined;
}

it('words the screen again when the language changes', async () => {
  const container = await containerShowingAForecast();
  expect(firstDay(container)).toBe('Today');

  await container.i18n.changeLanguage('xx');

  expect(firstDay(container)).toBe('Heute');
});

it('stops following the language once disposed', async () => {
  const container = await containerShowingAForecast();

  container.dispose();
  await container.i18n.changeLanguage('xx');

  expect(firstDay(container)).toBe('Today');
});

it('gives the place chosen in search to the home screen', async () => {
  const weatherRepository = new FakeWeatherRepository();
  weatherRepository.placesToReturn = [asheville];
  jest.useFakeTimers();
  const container = buildContainer({
    weatherRepository,
    settingsRepository: new FakeSettingsRepository('metric'),
    i18n: createI18n(['en']),
  });

  container.searchViewModel.queryChanged('ashe');
  await jest.runAllTimersAsync();
  container.searchViewModel.choose(0);
  jest.useRealTimers();

  expect(container.homeViewModel.store.getState().place?.title).toBe('Asheville');
});
