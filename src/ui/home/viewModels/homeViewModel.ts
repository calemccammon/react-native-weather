import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Forecast } from '../../../domain/models/forecast';
import { placeFromCoordinates, type Place } from '../../../domain/models/place';
import type { Units } from '../../../domain/models/units';
import type { GetForecast } from '../../../domain/useCases/getForecast';
import type { GetUnits } from '../../../domain/useCases/getUnits';
import type { SetUnits } from '../../../domain/useCases/setUnits';
import { messageForError } from '../../core/failureMessages';
import { forecastUiModelFrom, type Wording } from '../models/forecastUiModel';
import type { ForecastState, HomeState } from '../models/homeState';
import { placeUiModelFrom, type PlaceUiModel } from '../models/placeUiModel';
import { unitsUiModelFrom, unitsUiModelToDomain, type UnitsUiModel } from '../models/unitsUiModel';

export interface HomeViewModelDependencies {
  readonly getForecast: GetForecast;
  readonly getUnits: GetUnits;
  readonly setUnits: SetUnits;
  /** The app's wording as it is now; asked for each time the state is worded. */
  readonly wording: () => Wording;
  /** The country the device is set to, such as "US", if it says. */
  readonly deviceCountry?: string | null;
}

/** How the newest forecast request ended. A loaded forecast is in metric units. */
type Outcome =
  | { readonly kind: 'loaded'; readonly forecast: Forecast }
  | { readonly kind: 'failed'; readonly error: unknown };

/**
 * Holds the selected place and the chosen units, and loads the forecast.
 *
 * Selecting a place while an earlier forecast is still on its way throws the
 * earlier answer away when it arrives.
 */
export class HomeViewModel {
  /** What the screen shows. Components subscribe to it. */
  readonly store: StoreApi<HomeState>;

  private place: Place | null = null;

  /**
   * The selected place as the screen shows it. Made once per selection, so
   * the screen can tell a new place from the same one shown again.
   */
  private placeUiModel: PlaceUiModel | null = null;

  private units: Units;

  /** Null while the newest request is under way. */
  private outcome: Outcome | null = null;

  /**
   * Counts forecast requests, so an answer can tell whether it is still the
   * newest one.
   */
  private request = 0;

  constructor(private readonly dependencies: HomeViewModelDependencies) {
    this.units = dependencies.getUnits.execute(dependencies.deviceCountry);
    this.store = createStore<HomeState>(() => this.currentState());
  }

  /** Makes `place` the selected place and loads its forecast. */
  select = (place: Place): void => {
    this.place = place;
    this.placeUiModel = placeUiModelFrom(place, this.dependencies.wording().t);
    void this.load();
  };

  /** Selects a point picked straight off the map. */
  selectPoint = (latitude: number, longitude: number): void => {
    this.select(placeFromCoordinates(latitude, longitude));
  };

  clear = (): void => {
    this.place = null;
    this.placeUiModel = null;
    this.outcome = null;
    this.request++;
    this.show();
  };

  /**
   * Shows forecasts in `units` from now on, and remembers the choice. The
   * forecast already held is converted, so nothing is asked for again.
   */
  setUnits = (units: UnitsUiModel): void => {
    const chosen = unitsUiModelToDomain(units);
    if (chosen === this.units) return;
    this.units = chosen;
    // Not saved means the next launch starts from the old choice; this one
    // carries on with the new.
    this.dependencies.setUnits.execute(chosen).catch(() => undefined);
    this.show();
  };

  /** Asks for the selected place's forecast again, after a failure. */
  retryForecast = (): void => {
    if (this.place !== null) void this.load();
  };

  /**
   * Words what is on screen again. The state holds finished wording, so this
   * is called when the app's language changes.
   */
  reword = (): void => {
    if (this.place !== null && this.placeUiModel !== null) {
      // A place with no name is worded too. One that reads the same keeps
      // its model, so the screen does not take it for a new place.
      const reworded = placeUiModelFrom(this.place, this.dependencies.wording().t);
      if (reworded.title !== this.placeUiModel.title) this.placeUiModel = reworded;
    }
    this.show();
  };

  private async load(): Promise<void> {
    const place = this.place;
    if (place === null) return;
    const request = ++this.request;
    this.outcome = null;
    this.show();

    let outcome: Outcome;
    try {
      const forecast = await this.dependencies.getForecast.execute(place);
      outcome = { kind: 'loaded', forecast };
    } catch (error) {
      outcome = { kind: 'failed', error };
    }
    if (request === this.request) {
      this.outcome = outcome;
      this.show();
    }
  }

  private show(): void {
    this.store.setState(this.currentState(), true);
  }

  /** The place and the request's outcome, in the app's current wording. */
  private currentState(): HomeState {
    const units = unitsUiModelFrom(this.units);
    if (this.placeUiModel === null) return { units, place: null, forecast: { kind: 'idle' } };

    return { units, place: this.placeUiModel, forecast: this.forecastState() };
  }

  private forecastState(): ForecastState {
    const outcome = this.outcome;
    if (outcome === null) return { kind: 'loading' };

    const wording = this.dependencies.wording();
    return outcome.kind === 'loaded'
      ? {
          kind: 'loaded',
          forecast: forecastUiModelFrom(outcome.forecast, this.units, wording),
        }
      : { kind: 'failed', message: messageForError(outcome.error, wording.t) };
  }
}
