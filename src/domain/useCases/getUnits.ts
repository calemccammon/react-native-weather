import { unitsForCountry, type Units } from '../models/units';
import type { SettingsRepository } from '../repositories/settingsRepository';

/** Decides which units to show a forecast in. */
export class GetUnits {
  constructor(private readonly repository: SettingsRepository) {}

  /**
   * The user's own choice if they have made one; otherwise the units of the
   * country the device is set to (`deviceCountry`, such as "US").
   */
  execute(deviceCountry?: string | null): Units {
    return this.repository.units ?? unitsForCountry(deviceCountry);
  }
}
