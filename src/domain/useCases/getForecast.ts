import type { Forecast } from '../models/forecast';
import { normalizeLongitude, type Place } from '../models/place';
import type { Units } from '../models/units';
import { WeatherError, type WeatherRepository } from '../repositories/weatherRepository';

/** Gets the forecast for a place. */
export class GetForecast {
  constructor(private readonly repository: WeatherRepository) {}

  /**
   * The forecast at `place` in `units`.
   *
   * The longitude is brought into range first. A point off the globe fails
   * with `invalidPlace` without asking the repository.
   */
  async execute(place: Place, units: Units): Promise<Forecast> {
    // Written so that a NaN fails the check too.
    const onGlobe = Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude);
    if (!onGlobe) throw new WeatherError('invalidPlace');

    return this.repository.forecast({
      latitude: place.latitude,
      longitude: normalizeLongitude(place.longitude),
      units,
    });
  }
}
