import type { Units } from '../../../domain/models/units';

/** The choices the units control offers. */
export type UnitsUiModel = 'celsius' | 'fahrenheit';

export function unitsUiModelFrom(units: Units): UnitsUiModel {
  return units === 'metric' ? 'celsius' : 'fahrenheit';
}

export function unitsUiModelToDomain(units: UnitsUiModel): Units {
  return units === 'celsius' ? 'metric' : 'imperial';
}
