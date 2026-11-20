import type { Units } from '../../domain/models/units';
import type { SettingsRepository } from '../../domain/repositories/settingsRepository';

/** The part of AsyncStorage this repository uses. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const unitsKey = 'units';

// The stored words are this file's own, so renaming the domain's values
// cannot orphan a saved choice.
const stored: Readonly<Record<Units, string>> = { metric: 'metric', imperial: 'imperial' };

/** Keeps settings in the platform's own small key-value store. */
export class AsyncStorageSettingsRepository implements SettingsRepository {
  private constructor(
    private readonly store: KeyValueStore,
    private current: Units | null,
  ) {}

  /**
   * Reading the store takes a moment, so it is read once here, before the
   * app starts, and `units` can then answer at once.
   *
   * A store that cannot be read counts as one with nothing in it.
   */
  static async open(store: KeyValueStore): Promise<AsyncStorageSettingsRepository> {
    let saved: string | null = null;
    try {
      saved = await store.getItem(unitsKey);
    } catch {
      // Start as if nothing had been chosen.
    }
    const units = (Object.keys(stored) as Units[]).find((each) => stored[each] === saved);
    // Never chosen, or written by a version with a choice this one lacks.
    return new AsyncStorageSettingsRepository(store, units ?? null);
  }

  get units(): Units | null {
    return this.current;
  }

  async saveUnits(units: Units): Promise<void> {
    this.current = units;
    await this.store.setItem(unitsKey, stored[units]);
  }
}
