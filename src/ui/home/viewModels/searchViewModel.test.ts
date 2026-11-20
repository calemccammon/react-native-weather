import type { Place } from '../../../domain/models/place';
import { WeatherError } from '../../../domain/repositories/weatherRepository';
import { SearchPlaces } from '../../../domain/useCases/searchPlaces';
import { createI18n } from '../../../l10n/i18n';
import { asheville, ashford, FakeWeatherRepository } from '../../../testing/fakes';
import { placeUiModelFrom } from '../models/placeUiModel';
import { searchDebounceMs, SearchViewModel } from './searchViewModel';

let repository: FakeWeatherRepository;
let chosen: Place[];
let viewModel: SearchViewModel;

const i18n = createI18n(['en']);
// Stands in for a second language: English, but for the words the tests look at.
i18n.addResourceBundle(
  'xx',
  'translation',
  { failure: { noConnection: 'Keine Verbindung.' } },
  true,
);

const state = () => viewModel.store.getState();

/** Types `query` and waits out the pause before it is sent. */
async function search(query: string): Promise<void> {
  viewModel.queryChanged(query);
  await jest.advanceTimersByTimeAsync(searchDebounceMs);
}

/** Answers the search for `query` and lets the answer arrive. */
async function answer(query: string, places: Place[]): Promise<void> {
  repository.searches.get(query)?.resolve(places);
  await jest.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('en');
  repository = new FakeWeatherRepository();
  chosen = [];
  viewModel = new SearchViewModel({
    searchPlaces: new SearchPlaces(repository),
    onChoose: (place) => chosen.push(place),
    wording: () => ({ t: i18n.t, language: i18n.language }),
  });
});

afterEach(() => {
  viewModel.dispose();
  jest.useRealTimers();
});

it('starts idle and stays idle for a query too short to search', () => {
  expect(state()).toEqual({ kind: 'idle' });
  viewModel.queryChanged(' a ');
  expect(state()).toEqual({ kind: 'idle' });
});

it('waits for a pause in typing, then shows the results', async () => {
  viewModel.queryChanged('ash');
  await jest.advanceTimersByTimeAsync(200);
  viewModel.queryChanged('ashe');

  expect(state()).toEqual({ kind: 'loading', query: 'ashe' });
  await jest.advanceTimersByTimeAsync(searchDebounceMs - 1);
  expect(repository.searchQueries).toEqual([]);

  await jest.advanceTimersByTimeAsync(1);
  expect(repository.searchQueries).toEqual(['ashe']);

  await answer('ashe', [asheville, ashford]);
  expect(state()).toEqual({
    kind: 'results',
    query: 'ashe',
    places: [placeUiModelFrom(asheville), placeUiModelFrom(ashford)],
  });
});

it('says when nothing matches', async () => {
  await search('zzzz');
  await answer('zzzz', []);

  expect(state()).toEqual({ kind: 'empty', query: 'zzzz' });
});

it('does not search again for the same text with spaces around it', async () => {
  await search('ashe');
  await search(' ashe ');

  expect(repository.searchQueries).toEqual(['ashe']);
});

it('does not let an answer to an older query replace a newer one', async () => {
  await search('ash');
  await search('ashe');

  // The newer query answers first, the older one after it.
  await answer('ashe', [asheville]);
  await answer('ash', [ashford]);

  expect(state()).toEqual({
    kind: 'results',
    query: 'ashe',
    places: [placeUiModelFrom(asheville)],
  });
});

it('forgets a search still on its way when the text is cleared', async () => {
  await search('ashe');
  viewModel.queryChanged('');
  await answer('ashe', [asheville]);

  expect(state()).toEqual({ kind: 'idle' });
});

it('selects the place behind the row that was chosen', async () => {
  await search('ash');
  await answer('ash', [asheville, ashford]);

  viewModel.choose(1);
  viewModel.choose(5);
  viewModel.choose(-1);

  expect(chosen).toEqual([ashford]);
});

it('chooses nothing when no results are showing', async () => {
  await search('ash');
  await answer('ash', [asheville]);
  viewModel.queryChanged('ashx');

  viewModel.choose(0);

  expect(chosen).toEqual([]);
});

it('shows a failure and can be retried at once', async () => {
  await search('ashe');
  repository.searches.get('ashe')?.reject(new WeatherError('noConnection'));
  await jest.advanceTimersByTimeAsync(0);

  expect(state()).toEqual({
    kind: 'failed',
    query: 'ashe',
    message: 'Could not reach the weather service. Check your connection.',
  });

  viewModel.retry();
  expect(state()).toEqual({ kind: 'loading', query: 'ashe' });
  expect(repository.searchQueries).toEqual(['ashe', 'ashe']);

  await answer('ashe', [asheville]);
  expect(state().kind).toBe('results');
});

it('ends the wait on a failure nobody planned for', async () => {
  await search('ashe');
  repository.searches.get('ashe')?.reject(new TypeError('unplanned'));
  await jest.advanceTimersByTimeAsync(0);

  expect(state()).toMatchObject({
    kind: 'failed',
    message: 'Something went wrong. Please try again.',
  });
});

it('forgets the query when reset, so the same text searches afresh', async () => {
  await search('ashe');
  await answer('ashe', [asheville]);

  viewModel.reset();
  expect(state()).toEqual({ kind: 'idle' });
  viewModel.choose(0);
  expect(chosen).toEqual([]);

  await search('ashe');
  expect(repository.searchQueries).toEqual(['ashe', 'ashe']);
});

it('words a failure on screen again when the language changes', async () => {
  await search('ashe');
  repository.searches.get('ashe')?.reject(new WeatherError('noConnection'));
  await jest.advanceTimersByTimeAsync(0);

  await i18n.changeLanguage('xx');
  viewModel.reword();

  expect(state()).toEqual({ kind: 'failed', query: 'ashe', message: 'Keine Verbindung.' });
});

it('ignores an old answer for text that has since been typed again', async () => {
  await search('ash');
  await search('ashe');
  await search('ash');
  const [first, , second] = repository.searchCalls;

  second!.resolve([asheville]);
  await jest.advanceTimersByTimeAsync(0);
  first!.reject(new WeatherError('timeout'));
  await jest.advanceTimersByTimeAsync(0);

  expect(state()).toEqual({
    kind: 'results',
    query: 'ash',
    places: [placeUiModelFrom(asheville)],
  });
  viewModel.choose(0);
  expect(chosen).toEqual([asheville]);
});
