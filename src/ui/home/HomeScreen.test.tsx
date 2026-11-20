import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react';
import { I18nextProvider } from 'react-i18next';
import { PaperProvider } from 'react-native-paper';

import { buildContainer, type AppContainer } from '../../di/buildContainer';
import { WeatherError } from '../../domain/repositories/weatherRepository';
import { createI18n } from '../../l10n/i18n';
import {
  asheville,
  FakeSettingsRepository,
  FakeWeatherRepository,
  sampleForecast,
} from '../../testing/fakes';
import { appTheme } from '../core/theme';
import { sheetStops } from './components/BottomSheet';
import type { WeatherMapProps } from './components/WeatherMap.types';
import { HomeScreen } from './HomeScreen';
import { ViewModelsProvider } from './viewModels/ViewModelsContext';

// The real map is native code. This one records what the screen asks of it.
const mockMap: { props?: WeatherMapProps } = {};
jest.mock('./components/WeatherMap', () => ({
  WeatherMap: (props: WeatherMapProps) => {
    mockMap.props = props;
    return null;
  },
}));

const mockWindow = { width: 1200, height: 900, scale: 1, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

// The library's own stand-in: no insets, and no native module needed.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const desktop = { width: 1200, height: 900 };
const phone = { width: 400, height: 800 };

let repository: FakeWeatherRepository;
let settings: FakeSettingsRepository;
let container: AppContainer;

/**
 * Starts the screen over a repository that answers at once, unless the test
 * clears `placesToReturn` or `forecastToReturn` to answer by hand.
 */
async function renderScreen(size = desktop) {
  Object.assign(mockWindow, size);
  repository = new FakeWeatherRepository();
  repository.placesToReturn = [asheville];
  repository.forecastToReturn = sampleForecast();
  settings = new FakeSettingsRepository('imperial');
  container = buildContainer({
    weatherRepository: repository,
    settingsRepository: settings,
    i18n: createI18n(['en']),
  });

  await render(
    <PaperProvider theme={appTheme(false)}>
      <I18nextProvider i18n={container.i18n}>
        <ViewModelsProvider viewModels={container}>
          <HomeScreen />
        </ViewModelsProvider>
      </I18nextProvider>
    </PaperProvider>,
  );
  return userEvent.setup();
}

const searchBar = () => screen.getByPlaceholderText('Search for a place');
const hint = () => screen.queryByText(/^Search for a place, or press and hold/);

/** Selects a place without going through the search bar. */
async function select(place = asheville) {
  await act(async () => container.homeViewModel.select(place));
}

beforeEach(() => {
  mockMap.props = undefined;
});

it('starts with a hint and no forecast', async () => {
  await renderScreen();

  expect(hint()).toBeOnTheScreen();
  expect(screen.queryByText('This week')).not.toBeOnTheScreen();
  expect(mockMap.props?.pin).toBeNull();
});

describe('search', () => {
  it('shows the week of a place that was searched for and chosen', async () => {
    const user = await renderScreen();

    await user.type(searchBar(), 'ashev');
    await user.press(await screen.findByText('North Carolina, United States'));

    expect(await screen.findByText('This week')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('36°F')).toBeOnTheScreen();
    expect(screen.getByText('Feels like 31°')).toBeOnTheScreen();
    expect(screen.getByText('Wind 4 mph')).toBeOnTheScreen();
    expect(screen.getByText('80%')).toBeOnTheScreen();
    expect(screen.getByText('Weather data by Open-Meteo.com')).toBeOnTheScreen();
    expect(searchBar()).toHaveDisplayValue('Asheville');
    expect(repository.searchQueries).toEqual(['ashev']);
  });

  it('prompts for something to type when it opens', async () => {
    await renderScreen();

    await fireEvent(searchBar(), 'focus');

    expect(screen.getByText('Type a city, town or postcode')).toBeOnTheScreen();
  });

  it('says when nothing matches', async () => {
    const user = await renderScreen();
    repository.placesToReturn = [];

    await user.type(searchBar(), 'zzzz');

    expect(await screen.findByText('Nothing found for "zzzz"')).toBeOnTheScreen();
  });

  it('says what went wrong, and finds the place on another try', async () => {
    const user = await renderScreen();
    repository.failure = new WeatherError('noConnection');

    await user.type(searchBar(), 'ashev');
    expect(
      await screen.findByText('Could not reach the weather service. Check your connection.'),
    ).toBeOnTheScreen();

    repository.failure = undefined;
    await user.press(screen.getByText('Try again'));

    expect(await screen.findByText('North Carolina, United States')).toBeOnTheScreen();
  });

  it('does not search for the coordinates of a place picked from the map', async () => {
    await renderScreen();
    await act(async () => mockMap.props?.onLongPress(35.6, -82.55));
    expect(searchBar()).toHaveDisplayValue('35.60°N, 82.55°W');

    await fireEvent(searchBar(), 'focus');

    expect(searchBar()).toHaveDisplayValue('');
    expect(screen.getByText('Type a city, town or postcode')).toBeOnTheScreen();
    expect(repository.searchQueries).toEqual([]);
  });

  it('puts the place name back when it is closed without choosing', async () => {
    const user = await renderScreen();
    await select();

    await user.type(searchBar(), 'zz');
    expect(searchBar()).toHaveDisplayValue('zz');
    await user.press(screen.getByTestId('search-scrim'));

    expect(searchBar()).toHaveDisplayValue('Asheville');
    expect(screen.queryByText('Type a city, town or postcode')).not.toBeOnTheScreen();
    expect(screen.getByText('This week')).toBeOnTheScreen();
  });
});

describe('forecast', () => {
  it('offers another try after a failure, shows it is working, then shows the week', async () => {
    const user = await renderScreen();
    repository.forecastToReturn = undefined;
    await select();
    await act(async () => repository.forecasts[0]?.reject(new WeatherError('timeout')));

    expect(screen.getByText('The weather service took too long to answer.')).toBeOnTheScreen();
    expect(screen.queryByText('This week')).not.toBeOnTheScreen();

    await user.press(screen.getByText('Try again'));

    expect(screen.getByLabelText('Loading the forecast')).toBeOnTheScreen();
    expect(
      screen.queryByText('The weather service took too long to answer.'),
    ).not.toBeOnTheScreen();

    await act(async () => repository.forecasts[1]?.resolve(sampleForecast()));
    expect(screen.getByText('This week')).toBeOnTheScreen();
  });

  it('brings the hint back when the place is cleared', async () => {
    const user = await renderScreen();
    await select();
    expect(screen.getByText('This week')).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Clear place'));

    expect(hint()).toBeOnTheScreen();
    expect(screen.queryByText('This week')).not.toBeOnTheScreen();
    expect(searchBar()).toHaveDisplayValue('');
    expect(mockMap.props?.pin).toBeNull();
    // Clearing is not searching: the results stay shut.
    expect(screen.queryByTestId('search-scrim')).not.toBeOnTheScreen();
  });

  it('reads each block out as one sentence', async () => {
    await renderScreen();
    await select();

    expect(
      screen.getByLabelText('Now: Clear, 36 degrees Fahrenheit, feels like 31, wind 4 mph'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Sunday: Rain, low 29, high 64 degrees, 80 percent chance of precipitation',
      ),
    ).toBeOnTheScreen();
  });

  it('shows the forecast in Celsius when that is chosen, and remembers the choice', async () => {
    const user = await renderScreen();
    await select();
    expect(screen.getByText('36°F')).toBeOnTheScreen();

    await user.press(screen.getByText('°C'));

    expect(await screen.findByText('36°C')).toBeOnTheScreen();
    expect(screen.getByText('Wind 4 km/h')).toBeOnTheScreen();
    expect(repository.forecastRequests.at(-1)?.units).toBe('metric');
    await waitFor(() => expect(settings.units).toBe('metric'));
  });
});

describe('map', () => {
  it('picks the point under a press-and-hold', async () => {
    await renderScreen();

    await act(async () => mockMap.props?.onLongPress(35.6, -82.55));

    expect(screen.getByText('This week')).toBeOnTheScreen();
    expect(repository.forecastRequests).toEqual([
      { latitude: 35.6, longitude: -82.55, units: 'imperial' },
    ]);
    expect(mockMap.props?.pin).toEqual({ latitude: 35.6, longitude: -82.55 });
  });

  it('is told the side panel covers its left on a wide window', async () => {
    await renderScreen(desktop);
    await select();

    expect(mockMap.props?.pin).toEqual({ latitude: 35.6, longitude: -82.55 });
    expect(mockMap.props?.covered).toEqual({ top: 0, right: 0, bottom: 0, left: 432 });
  });

  it('is told the search bar and the sheet cover its top and bottom on a phone', async () => {
    await renderScreen(phone);
    await select();

    expect(mockMap.props?.covered).toEqual({
      top: 84,
      right: 0,
      bottom: phone.height * sheetStops.resting,
      left: 0,
    });
  });

  it('follows the theme', async () => {
    await renderScreen();

    expect(mockMap.props?.dark).toBe(false);
    expect(mockMap.props?.pinColor).toBe(appTheme(false).colors.primary);
  });
});

describe('layout', () => {
  it('shows the forecast in a bottom sheet on a phone-sized window', async () => {
    await renderScreen(phone);
    await select();

    expect(screen.getByLabelText('Show more of the forecast')).toBeOnTheScreen();
    expect(screen.getByText('36°F')).toBeOnTheScreen();
  });

  it('shows it in a side panel, with no sheet, on a wide window', async () => {
    await renderScreen(desktop);
    await select();

    expect(screen.queryByLabelText('Show more of the forecast')).not.toBeOnTheScreen();
    expect(screen.getByText('36°F')).toBeOnTheScreen();
  });

  it('keeps the place and its name in the search bar when the window narrows', async () => {
    await renderScreen(desktop);
    await select();

    Object.assign(mockWindow, phone);
    await screen.rerender(
      <PaperProvider theme={appTheme(false)}>
        <I18nextProvider i18n={container.i18n}>
          <ViewModelsProvider viewModels={container}>
            <HomeScreen />
          </ViewModelsProvider>
        </I18nextProvider>
      </PaperProvider>,
    );

    expect(searchBar()).toHaveDisplayValue('Asheville');
    expect(screen.getByLabelText('Show more of the forecast')).toBeOnTheScreen();
    expect(mockMap.props?.covered.left).toBe(0);
  });
});
