import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';

import type { HomeState } from '../ui/home/models/homeState';
import type { SearchState } from '../ui/home/models/searchState';
import type { HomeViewModel } from '../ui/home/viewModels/homeViewModel';
import type { SearchViewModel } from '../ui/home/viewModels/searchViewModel';
import type { AppContainer } from './buildContainer';

const AppContainerContext = createContext<AppContainer | null>(null);

export function AppContainerProvider(props: { container: AppContainer; children: ReactNode }) {
  return (
    <AppContainerContext.Provider value={props.container}>
      {props.children}
    </AppContainerContext.Provider>
  );
}

function useContainer(): AppContainer {
  const container = useContext(AppContainerContext);
  if (container === null) throw new Error('No AppContainerProvider above this component.');
  return container;
}

export function useHomeViewModel(): HomeViewModel {
  return useContainer().homeViewModel;
}

/** The part of the home screen's state that `select` picks; re-renders when it changes. */
export function useHomeState<T>(select: (state: HomeState) => T): T {
  return useStore(useHomeViewModel().store, select);
}

export function useSearchViewModel(): SearchViewModel {
  return useContainer().searchViewModel;
}

export function useSearchState(): SearchState {
  return useStore(useSearchViewModel().store);
}
