import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Place } from '../../../domain/models/place';
import { isSearchable, type SearchPlaces } from '../../../domain/useCases/searchPlaces';
import { messageForError } from '../../core/failureMessages';
import type { Wording } from '../models/forecastUiModel';
import { placeUiModelFrom } from '../models/placeUiModel';
import type { SearchState } from '../models/searchState';

/** How long typing must pause before a search is sent. */
export const searchDebounceMs = 350;

export interface SearchViewModelDependencies {
  readonly searchPlaces: SearchPlaces;
  /** What to do with the place the user chooses. */
  readonly onChoose: (place: Place) => void;
  /** The app's wording as it is now; asked for each time the state is worded. */
  readonly wording: () => Wording;
}

/**
 * Turns what the user types into search results.
 *
 * It waits for a pause in typing before searching, and an answer that comes
 * back after a newer search has been sent is thrown away.
 */
export class SearchViewModel {
  /** What the search results area shows. Components subscribe to it. */
  readonly store: StoreApi<SearchState> = createStore<SearchState>(() => ({ kind: 'idle' }));

  private debounce: ReturnType<typeof setTimeout> | undefined;

  /** The text last asked about; what `retry` asks about again. */
  private latestQuery = '';

  /**
   * Counts changes of the query, so an answer can tell whether it is still
   * wanted. The text alone cannot: the same text can be searched for twice.
   */
  private request = 0;

  /** The places behind the rows of the current results, in order. */
  private results: readonly Place[] = [];

  /** What the current `failed` state is reporting. */
  private error: unknown;

  constructor(private readonly dependencies: SearchViewModelDependencies) {}

  queryChanged = (text: string): void => {
    const query = text.trim();
    if (query === this.latestQuery) return;
    this.latestQuery = query;
    this.request++;
    clearTimeout(this.debounce);

    if (!isSearchable(query)) {
      this.store.setState({ kind: 'idle' }, true);
      return;
    }
    this.store.setState({ kind: 'loading', query }, true);
    this.debounce = setTimeout(() => void this.search(query), searchDebounceMs);
  };

  /** Forgets the current query and results, as when the search bar is cleared. */
  reset = (): void => {
    clearTimeout(this.debounce);
    this.latestQuery = '';
    this.request++;
    this.results = [];
    this.store.setState({ kind: 'idle' }, true);
  };

  /** Makes the result in row `index` the selected place. */
  choose = (index: number): void => {
    const place = this.results[index];
    if (this.store.getState().kind !== 'results' || place === undefined) return;
    this.dependencies.onChoose(place);
  };

  /** Runs the last search again after a failure. */
  retry = (): void => {
    const query = this.latestQuery;
    if (!isSearchable(query)) return;
    clearTimeout(this.debounce);
    this.request++;
    this.store.setState({ kind: 'loading', query }, true);
    void this.search(query);
  };

  /**
   * Words a failure on screen again. Its message is finished wording, so
   * this is called when the app's language changes.
   */
  reword = (): void => {
    const state = this.store.getState();
    if (state.kind !== 'failed') return;
    this.store.setState(
      { ...state, message: messageForError(this.error, this.dependencies.wording().t) },
      true,
    );
  };

  /** Stops waiting on a pause in typing. Call when the view model is done with. */
  dispose = (): void => {
    clearTimeout(this.debounce);
    this.request++;
  };

  private async search(query: string): Promise<void> {
    const request = this.request;
    let places: Place[] = [];
    let error: unknown;
    let state: SearchState;
    try {
      places = await this.dependencies.searchPlaces.execute(query);
      state =
        places.length === 0
          ? { kind: 'empty', query }
          : { kind: 'results', query, places: places.map(placeUiModelFrom) };
    } catch (caught) {
      error = caught;
      state = {
        kind: 'failed',
        query,
        message: messageForError(caught, this.dependencies.wording().t),
      };
    }
    if (request !== this.request) return;
    this.results = places;
    this.error = error;
    this.store.setState(state, true);
  }
}
