import type { PlaceUiModel } from './placeUiModel';

/**
 * What the search results area is showing.
 *
 * - `idle`: nothing typed yet, or too little to search for.
 * - `loading`: waiting, either for the user to stop typing or for the answer.
 */
export type SearchState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly query: string }
  | { readonly kind: 'results'; readonly query: string; readonly places: readonly PlaceUiModel[] }
  | { readonly kind: 'empty'; readonly query: string }
  | { readonly kind: 'failed'; readonly query: string; readonly message: string };
