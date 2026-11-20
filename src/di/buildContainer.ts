import type { i18n } from 'i18next';

import type { SettingsRepository } from '../domain/repositories/settingsRepository';
import type { WeatherRepository } from '../domain/repositories/weatherRepository';
import { GetForecast } from '../domain/useCases/getForecast';
import { GetUnits } from '../domain/useCases/getUnits';
import { SearchPlaces } from '../domain/useCases/searchPlaces';
import { SetUnits } from '../domain/useCases/setUnits';
import { HomeViewModel } from '../ui/home/viewModels/homeViewModel';
import { SearchViewModel } from '../ui/home/viewModels/searchViewModel';

/** Everything the screen needs, already wired together. */
export interface AppContainer {
  readonly i18n: i18n;
  readonly homeViewModel: HomeViewModel;
  readonly searchViewModel: SearchViewModel;
  /** Lets go of what the container holds on to. Call when it is replaced. */
  readonly dispose: () => void;
}

/** What `buildContainer` is given: the implementations and the device's facts. */
export interface ContainerParts {
  readonly weatherRepository: WeatherRepository;
  readonly settingsRepository: SettingsRepository;
  readonly i18n: i18n;
  /** The country the device is set to, such as "US", if it says. */
  readonly deviceCountry?: string | null;
}

/**
 * Wires use cases and view models over the given repositories. Tests call
 * this with fakes; the app calls `createContainer` in `container.ts`.
 */
export function buildContainer(parts: ContainerParts): AppContainer {
  const { i18n } = parts;
  const wording = () => ({ t: i18n.t, language: i18n.language });

  const homeViewModel = new HomeViewModel({
    getForecast: new GetForecast(parts.weatherRepository),
    getUnits: new GetUnits(parts.settingsRepository),
    setUnits: new SetUnits(parts.settingsRepository),
    wording,
    deviceCountry: parts.deviceCountry,
  });
  const searchViewModel = new SearchViewModel({
    searchPlaces: new SearchPlaces(parts.weatherRepository),
    onChoose: homeViewModel.select,
    wording,
  });

  const reword = () => {
    homeViewModel.reword();
    searchViewModel.reword();
  };
  i18n.on('languageChanged', reword);

  const dispose = () => {
    i18n.off('languageChanged', reword);
    searchViewModel.dispose();
  };
  return { i18n, homeViewModel, searchViewModel, dispose };
}
