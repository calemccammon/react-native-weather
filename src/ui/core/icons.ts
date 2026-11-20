import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/** The name of an icon in the Material Community set, which Paper draws. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
