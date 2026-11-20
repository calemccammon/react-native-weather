import { weatherConditions } from '../../domain/models/weatherCondition';
import { weatherConditionFromWmo } from './wmoCode';

describe('weatherConditionFromWmo', () => {
  it.each([
    [0, 'clear'],
    [1, 'mostlyClear'],
    [2, 'partlyCloudy'],
    [3, 'overcast'],
    [48, 'fog'],
    [55, 'drizzle'],
    [57, 'freezingDrizzle'],
    [63, 'rain'],
    [66, 'freezingRain'],
    [77, 'snow'],
    [82, 'rainShowers'],
    [86, 'snowShowers'],
    [99, 'thunderstorm'],
  ])('reads code %d as %s', (code, condition) => {
    expect(weatherConditionFromWmo(code)).toBe(condition);
  });

  it('reads a code outside the table, or no code, as unknown', () => {
    expect(weatherConditionFromWmo(4)).toBe('unknown');
    expect(weatherConditionFromWmo(-1)).toBe('unknown');
    expect(weatherConditionFromWmo(null)).toBe('unknown');
    expect(weatherConditionFromWmo(undefined)).toBe('unknown');
  });

  it('can produce every condition but unknown from some code', () => {
    const reachable = new Set(
      Array.from({ length: 100 }, (_, code) => weatherConditionFromWmo(code)),
    );

    expect([...reachable].sort()).toEqual([...weatherConditions].sort());
  });
});
