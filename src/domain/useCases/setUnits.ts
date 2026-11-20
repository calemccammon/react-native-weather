import type { Units } from '../models/units';
import type { SettingsRepository } from '../repositories/settingsRepository';

/** Records the units the user chose, for this launch and later ones. */
export class SetUnits {
  constructor(private readonly repository: SettingsRepository) {}

  execute(units: Units): Promise<void> {
    return this.repository.saveUnits(units);
  }
}
