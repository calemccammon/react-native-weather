import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';

import type { HomeState } from '../models/homeState';
import type { SearchState } from '../models/searchState';
import type { HomeViewModel } from './homeViewModel';
import type { SearchViewModel } from './searchViewModel';

/** The view models the home screen draws from. */
export interface ViewModels {
  readonly homeViewModel: HomeViewModel;
  readonly searchViewModel: SearchViewModel;
}

const ViewModelsContext = createContext<ViewModels | null>(null);

/**
 * Hands the view models to the components below it. Whoever builds them (the
 * app, or a test) puts them here, so no component knows how they are made.
 */
export function ViewModelsProvider(props: { viewModels: ViewModels; children: ReactNode }) {
  return (
    <ViewModelsContext.Provider value={props.viewModels}>
      {props.children}
    </ViewModelsContext.Provider>
  );
}

function useViewModels(): ViewModels {
  const viewModels = useContext(ViewModelsContext);
  if (viewModels === null) throw new Error('No ViewModelsProvider above this component.');
  return viewModels;
}

export function useHomeViewModel(): HomeViewModel {
  return useViewModels().homeViewModel;
}

/** The part of the home screen's state that `select` picks; re-renders when it changes. */
export function useHomeState<T>(select: (state: HomeState) => T): T {
  return useStore(useHomeViewModel().store, select);
}

export function useSearchViewModel(): SearchViewModel {
  return useViewModels().searchViewModel;
}

export function useSearchState(): SearchState {
  return useStore(useSearchViewModel().store);
}
