/**
 * Helpers for reading decoded JSON whose shape cannot be trusted.
 *
 * Each throws a `FormatError` when the value is not what was expected, so a
 * surprising response is reported as one and never as `undefined` turning up
 * somewhere later.
 */
export class FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormatError';
  }
}

export type JsonObject = Record<string, unknown>;

export function readObject(value: unknown, what: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new FormatError(`${what} is not an object`);
  }
  return value as JsonObject;
}

/** A list in which every item passes `isItem`. */
export function readList<T>(
  value: unknown,
  what: string,
  isItem: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new FormatError(`${what} is not a list of the expected items`);
  }
  return value;
}

export function readValue<T>(
  object: JsonObject,
  key: string,
  isValue: (value: unknown) => value is T,
): T {
  const value = object[key];
  if (!isValue(value)) throw new FormatError(`${key} is not of the expected type`);
  return value;
}

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export const isAnything = (value: unknown): value is unknown => true;

/** Accepts `isValue`'s type, and also a value that is null or missing. */
export function orNull<T>(isValue: (value: unknown) => value is T) {
  return (value: unknown): value is T | null | undefined =>
    value === null || value === undefined || isValue(value);
}
