import { WeatherError, type WeatherFailure } from '../../domain/repositories/weatherRepository';
import { OpenMeteoWeatherRepository, type Fetch } from './openMeteoWeatherRepository';

/** A `fetch` that answers every request with `body`, and records the URLs. */
function answering(body: unknown, status = 200) {
  const urls: URL[] = [];
  const fetch: Fetch = async (url) => {
    urls.push(new URL(url));
    return { status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
  return { fetch, urls };
}

const forecastBody = {
  current: {
    time: '2026-11-18T09:00',
    temperature_2m: 35.8,
    apparent_temperature: 31.3,
    weather_code: 3,
    wind_speed_10m: 4.4,
    is_day: 1,
  },
  daily: {
    time: ['2026-11-18', '2026-11-19', '2026-11-20'],
    weather_code: [0, 61, null],
    temperature_2m_max: [64.3, 58.1, null],
    temperature_2m_min: [30.2, 41.9, null],
    precipitation_probability_max: [0, 46.6, null],
  },
};

const somewhere = { latitude: 35.6, longitude: -82.55, units: 'imperial' as const };

async function failureOf(promise: Promise<unknown>): Promise<WeatherFailure | undefined> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof WeatherError) return error.failure;
    throw error;
  }
  return undefined;
}

describe('searching for places', () => {
  it('asks the geocoding service and reads its results', async () => {
    const { fetch, urls } = answering({
      results: [
        {
          name: 'Asheville',
          latitude: 35.6,
          longitude: -82.55,
          admin1: 'North Carolina',
          country: 'United States',
        },
        { name: 'Ashford', latitude: 51.15, longitude: 0.87 },
      ],
    });

    const places = await new OpenMeteoWeatherRepository(fetch).searchPlaces('ash ford');

    expect(places).toEqual([
      {
        name: 'Asheville',
        latitude: 35.6,
        longitude: -82.55,
        region: 'North Carolina',
        country: 'United States',
      },
      { name: 'Ashford', latitude: 51.15, longitude: 0.87 },
    ]);
    expect(urls[0]!.origin + urls[0]!.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    );
    expect(urls[0]?.searchParams.get('name')).toBe('ash ford');
  });

  it('reads a response with no results key as no matches', async () => {
    const { fetch } = answering({ generationtime_ms: 0.4 });

    await expect(new OpenMeteoWeatherRepository(fetch).searchPlaces('zzzz')).resolves.toEqual([]);
  });

  it.each([
    ['results that are not a list', { results: 'none' }],
    ['a result that is not an object', { results: ['Asheville'] }],
    ['a result with no name', { results: [{ latitude: 1, longitude: 2 }] }],
    ['a result whose latitude is text', { results: [{ name: 'A', latitude: '1', longitude: 2 }] }],
  ])('reports %s as a bad response', async (_, body) => {
    const { fetch } = answering(body);

    expect(await failureOf(new OpenMeteoWeatherRepository(fetch).searchPlaces('ash'))).toBe(
      'badResponse',
    );
  });
});

describe('getting a forecast', () => {
  it('reads codes as conditions and columns as days, leaving out a day with no temperatures', async () => {
    const { fetch } = answering(forecastBody);

    const forecast = await new OpenMeteoWeatherRepository(fetch).forecast(somewhere);

    expect(forecast.current).toEqual({
      observedAt: '2026-11-18T09:00',
      temperature: 35.8,
      feelsLike: 31.3,
      windSpeed: 4.4,
      condition: 'overcast',
      isDay: true,
    });
    expect(forecast.days).toEqual([
      { date: '2026-11-18', high: 64.3, low: 30.2, condition: 'clear', precipitationChance: 0 },
      { date: '2026-11-19', high: 58.1, low: 41.9, condition: 'rain', precipitationChance: 47 },
    ]);
  });

  it('asks in the units wanted, on the place’s own clock', async () => {
    const imperial = answering(forecastBody);
    await new OpenMeteoWeatherRepository(imperial.fetch).forecast(somewhere);
    const metric = answering(forecastBody);
    await new OpenMeteoWeatherRepository(metric.fetch).forecast({ ...somewhere, units: 'metric' });

    const sent = imperial.urls[0]!.searchParams;
    expect(imperial.urls[0]!.origin + imperial.urls[0]!.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast',
    );
    expect(sent.get('latitude')).toBe('35.6');
    expect(sent.get('longitude')).toBe('-82.55');
    expect(sent.get('timezone')).toBe('auto');
    expect([sent.get('temperature_unit'), sent.get('wind_speed_unit')]).toEqual([
      'fahrenheit',
      'mph',
    ]);
    expect([
      metric.urls[0]!.searchParams.get('temperature_unit'),
      metric.urls[0]!.searchParams.get('wind_speed_unit'),
    ]).toEqual(['celsius', 'kmh']);
  });

  it('copes without the column of precipitation chances', async () => {
    const { precipitation_probability_max: _, ...daily } = forecastBody.daily;
    const { fetch } = answering({ ...forecastBody, daily });

    const forecast = await new OpenMeteoWeatherRepository(fetch).forecast(somewhere);

    expect(forecast.days[0]).toEqual({
      date: '2026-11-18',
      high: 64.3,
      low: 30.2,
      condition: 'clear',
    });
  });

  it.each([
    ['no current conditions', { daily: forecastBody.daily }],
    ['no days', { current: forecastBody.current }],
    [
      'a temperature that is text',
      { ...forecastBody, current: { ...forecastBody.current, temperature_2m: 'warm' } },
    ],
    [
      'a time that is not a date',
      { ...forecastBody, current: { ...forecastBody.current, time: 'this morning' } },
    ],
    [
      'a day that is not a date',
      { ...forecastBody, daily: { ...forecastBody.daily, time: ['Wed', 'Thu', 'Fri'] } },
    ],
    [
      'columns of different lengths',
      { ...forecastBody, daily: { ...forecastBody.daily, weather_code: [0, 61] } },
    ],
    [
      'a column that is not a list',
      { ...forecastBody, daily: { ...forecastBody.daily, temperature_2m_max: 64.3 } },
    ],
  ])('reports %s as a bad response', async (_, body) => {
    const { fetch } = answering(body);

    expect(await failureOf(new OpenMeteoWeatherRepository(fetch).forecast(somewhere))).toBe(
      'badResponse',
    );
  });
});

describe('when the service does not answer properly', () => {
  it("reports the service's own refusal, keeping its reason for the logs", async () => {
    const { fetch } = answering({ error: true, reason: 'Latitude must be in range.' }, 400);

    const error = await new OpenMeteoWeatherRepository(fetch).forecast(somewhere).catch((e) => e);

    expect(error).toBeInstanceOf(WeatherError);
    expect(error.failure).toBe('rejected');
    expect(error.detail).toBe('Latitude must be in range.');
  });

  it('reports an error status with no reason as a refusal', async () => {
    const { fetch } = answering({}, 503);

    const error = await new OpenMeteoWeatherRepository(fetch).searchPlaces('ash').catch((e) => e);

    expect([error.failure, error.detail]).toEqual(['rejected', 'HTTP 503']);
  });

  it.each([
    ['text that is not JSON', '<html>Bad gateway</html>'],
    ['JSON that is not an object', '[1, 2, 3]'],
  ])('reports %s as a bad response', async (_, body) => {
    const { fetch } = answering(body);

    expect(await failureOf(new OpenMeteoWeatherRepository(fetch).searchPlaces('ash'))).toBe(
      'badResponse',
    );
  });

  it('reports a request that cannot be made as no connection', async () => {
    const fetch: Fetch = async () => {
      throw new TypeError('Network request failed');
    };

    expect(await failureOf(new OpenMeteoWeatherRepository(fetch).searchPlaces('ash'))).toBe(
      'noConnection',
    );
  });

  it('gives up on an answer that takes too long, and stops the request', async () => {
    jest.useFakeTimers();
    try {
      let stopped = false;
      // Never answers; fails only when told to stop, as the real fetch does.
      const fetch: Fetch = (_, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            stopped = true;
            reject(new Error('Aborted'));
          });
        });

      const failure = failureOf(new OpenMeteoWeatherRepository(fetch, 1000).searchPlaces('ash'));
      await jest.advanceTimersByTimeAsync(999);
      expect(stopped).toBe(false);
      await jest.advanceTimersByTimeAsync(1);

      expect(await failure).toBe('timeout');
      expect(stopped).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
