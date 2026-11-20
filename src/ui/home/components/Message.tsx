import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import type { IconName } from '../../core/icons';
import { iconSizes, spacing } from '../../core/tokens';

interface MessageProps {
  readonly icon: IconName;
  readonly text: string;
  /**
   * What the message is: a pointer on what to do next (`hint`), something
   * that went wrong (`error`), or a quiet note (`muted`).
   */
  readonly tone: 'hint' | 'error' | 'muted';
  /** Something to press, shown after the text. */
  readonly action?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/** An icon and a sentence: a hint, an empty result or a failure. */
export function Message(props: MessageProps) {
  const { colors } = useTheme();
  const muted = props.tone === 'muted';
  const iconColor =
    props.tone === 'hint' ? colors.primary : muted ? colors.onSurfaceVariant : colors.error;

  return (
    <View style={[styles.message, props.style]}>
      <Icon source={props.icon} size={iconSizes.row} color={iconColor} />
      <Text variant="bodyLarge" style={[styles.text, muted && { color: colors.onSurfaceVariant }]}>
        {props.text}
      </Text>
      {props.action}
    </View>
  );
}

const styles = StyleSheet.create({
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  text: { flex: 1 },
});
