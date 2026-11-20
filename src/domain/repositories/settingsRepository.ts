import type { Units } from '../models/units';

/** What the user has chosen for the app, kept between launches. */
export interface SettingsRepository {
  /** The units the user chose, or null if they have never chosen. */
  readonly units: Units | null;

  saveUnits(units: Units): Promise<void>;
}
