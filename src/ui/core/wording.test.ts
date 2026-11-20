import { weatherConditions } from '../../domain/models/weatherCondition';
import { WeatherError, weatherFailures } from '../../domain/repositories/weatherRepository';
import { englishWording } from '../../testing/fakes';
import { failureMessage, messageForError } from './failureMessages';
import { conditionIcon, conditionLabel } from './weatherConditionUi';

const { t } = englishWording();

it('words every condition differently', () => {
  const labels = new Set(weatherConditions.map((condition) => conditionLabel(condition, t)));

  expect(labels.size).toBe(weatherConditions.length);
  expect(conditionLabel('partlyCloudy', t)).toBe('Partly cloudy');
});

it('draws clear and partly cloudy skies differently at night', () => {
  for (const condition of ['clear', 'mostlyClear', 'partlyCloudy'] as const) {
    expect(conditionIcon(condition, false)).not.toBe(conditionIcon(condition));
  }
  expect(conditionIcon('rain', false)).toBe(conditionIcon('rain'));
});

it('has its own sentence for every kind of failure', () => {
  const messages = new Set(weatherFailures.map((failure) => failureMessage(failure, t)));

  expect(messages.size).toBe(weatherFailures.length);
  // A key missing from the strings file would come back as the key itself.
  expect([...messages].every((message) => message.endsWith('.'))).toBe(true);
});

it("never shows the service's own words for an error", () => {
  const refused = new WeatherError('rejected', 'Latitude must be in range of -90 to 90°.');

  expect(messageForError(refused, t)).toBe('The weather service refused the request.');
  expect(messageForError(new Error('boom'), t)).toBe('Something went wrong. Please try again.');
  expect(messageForError('boom', t)).toBe('Something went wrong. Please try again.');
});
