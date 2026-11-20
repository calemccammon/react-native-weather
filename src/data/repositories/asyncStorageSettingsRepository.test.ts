import { allUnits } from '../../domain/models/units';
import {
  AsyncStorageSettingsRepository,
  type KeyValueStore,
} from './asyncStorageSettingsRepository';

/** A key-value store held in memory. */
function storeOver(initial: Record<string, string> = {}): KeyValueStore & {
  readonly items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
  };
}

it('has no units until some are saved', async () => {
  const repository = await AsyncStorageSettingsRepository.open(storeOver());

  expect(repository.units).toBeNull();
});

it('keeps a saved choice for the next launch', async () => {
  const store = storeOver();
  const repository = await AsyncStorageSettingsRepository.open(store);

  for (const units of allUnits) {
    await repository.saveUnits(units);
    expect(repository.units).toBe(units);

    // What a later launch would read from the same store.
    expect((await AsyncStorageSettingsRepository.open(store)).units).toBe(units);
  }
});

it('counts something unreadable in the store as no choice', async () => {
  const repository = await AsyncStorageSettingsRepository.open(storeOver({ units: 'kelvin' }));

  expect(repository.units).toBeNull();
});

it('starts with no choice when the store cannot be read', async () => {
  const broken: KeyValueStore = {
    getItem: async () => {
      throw new Error('storage unavailable');
    },
    setItem: async () => undefined,
  };

  expect((await AsyncStorageSettingsRepository.open(broken)).units).toBeNull();
});

it('reports a choice that could not be stored', async () => {
  const full: KeyValueStore = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error('disk full');
    },
  };
  const repository = await AsyncStorageSettingsRepository.open(full);

  await expect(repository.saveUnits('metric')).rejects.toThrow('disk full');
});
