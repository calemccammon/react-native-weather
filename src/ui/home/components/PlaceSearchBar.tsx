import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { Button, List, ProgressBar, Searchbar, Surface } from 'react-native-paper';

import {
  useHomeState,
  useHomeViewModel,
  useSearchState,
  useSearchViewModel,
} from '../viewModels/ViewModelsContext';
import { shapes, spacing } from '../../core/tokens';
import type { SearchState } from '../models/searchState';
import { Message } from './Message';

interface PlaceSearchBarProps {
  /** Whether the results are showing under the bar. */
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The tallest the results may grow before they scroll. */
  readonly maxResultsHeight: number;
}

/**
 * Material 3 search bar with the matching places listed under it.
 *
 * It draws what the search view model says and tells it what was typed; it
 * does no searching itself.
 */
export function PlaceSearchBar(props: PlaceSearchBarProps) {
  const { open, onOpenChange } = props;
  const { t } = useTranslation();
  const home = useHomeViewModel();
  const search = useSearchViewModel();
  const placeTitle = useHomeState((state) => state.place?.title ?? '');
  const [text, setText] = useState(placeTitle);

  // A place picked on the map shows its name in the bar too. Updating state
  // while rendering is React's way to follow a value that changed.
  const [shownTitle, setShownTitle] = useState(placeTitle);
  if (shownTitle !== placeTitle) {
    setShownTitle(placeTitle);
    setText(placeTitle);
  }

  const close = () => {
    onOpenChange(false);
    Keyboard.dismiss();
  };

  // Leaving without choosing puts the chosen place's name back.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      setText(home.store.getState().place?.title ?? '');
      // Takes the cursor out of the bar, on every platform.
      Keyboard.dismiss();
    }
    wasOpen.current = open;
  }, [open, home]);

  // Android's back button closes the results before it leaves the app.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onOpenChange(false);
      return true;
    });
    return () => subscription.remove();
  }, [open, onOpenChange]);

  return (
    <View>
      <Searchbar
        mode="bar"
        elevation={2}
        placeholder={t('search.hint')}
        searchAccessibilityLabel={t('search.hint')}
        clearAccessibilityLabel={t('search.clear')}
        value={text}
        // The bar shows the chosen place's name, which is a label and not
        // something to search for, so opening it starts from empty. (Android
        // loses typed letters when the name is selected for replacing.)
        onFocus={() => {
          // Focus coming back to a bar that is already open (after a press on
          // "Try again", say) keeps what is typed and found.
          if (open) return;
          setText('');
          search.reset();
          onOpenChange(true);
        }}
        onChangeText={(value) => {
          setText(value);
          search.queryChanged(value);
          // The clear button empties the bar without opening the results.
          if (!open && value !== '') onOpenChange(true);
        }}
        onClearIconPress={() => {
          search.reset();
          home.clear();
        }}
      />
      {open && (
        <Surface elevation={3} style={styles.results}>
          <SearchResults
            maxHeight={props.maxResultsHeight}
            onChoose={(index) => {
              search.choose(index);
              close();
            }}
          />
        </Surface>
      )}
    </View>
  );
}

function SearchResults(props: { maxHeight: number; onChoose: (index: number) => void }) {
  const state: SearchState = useSearchState();

  if (state.kind !== 'results') {
    // What is happening is read out as it changes: searching, then what came
    // of it.
    return (
      <View testID="search-status" aria-live="polite">
        <SearchStatus state={state} />
      </View>
    );
  }
  return (
    <ScrollView style={{ maxHeight: props.maxHeight }} keyboardShouldPersistTaps="handled">
      {state.places.map((place, index) => (
        <List.Item
          key={`${place.latitude},${place.longitude},${place.title}`}
          title={place.title}
          description={place.subtitle === '' ? undefined : place.subtitle}
          left={(item) => <List.Icon {...item} icon="map-marker-outline" />}
          onPress={() => props.onChoose(index)}
        />
      ))}
    </ScrollView>
  );
}

/** Every state of a search but its results. */
function SearchStatus(props: { state: Exclude<SearchState, { kind: 'results' }> }) {
  const { t } = useTranslation();
  const search = useSearchViewModel();
  const { state } = props;

  switch (state.kind) {
    case 'idle':
      return (
        <Message
          icon="map-search-outline"
          tone="muted"
          text={t('search.prompt')}
          style={styles.message}
        />
      );
    case 'loading':
      return (
        <View accessible accessibilityLabel={t('search.searching')}>
          <ProgressBar indeterminate />
        </View>
      );
    case 'empty':
      return (
        <Message
          icon="magnify-close"
          tone="muted"
          text={t('search.nothingFound', { query: state.query })}
          style={styles.message}
        />
      );
    case 'failed':
      return (
        <Message
          icon="cloud-off-outline"
          tone="muted"
          text={state.message}
          style={styles.message}
          action={
            <Button mode="text" onPress={search.retry}>
              {t('tryAgain')}
            </Button>
          }
        />
      );
  }
}

const styles = StyleSheet.create({
  results: {
    marginTop: spacing.sm,
    borderRadius: shapes.extraLarge,
    overflow: 'hidden',
  },
  message: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
