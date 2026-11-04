import { Text, type TextProps } from 'react-native';

import { colors, typography } from './theme';

type AppTextProps = TextProps & {
  variant?: keyof typeof typography;
  color?: 'text' | 'textMuted' | 'onPrimary' | 'danger';
};

export function AppText({ variant = 'body', color = 'text', style, ...props }: AppTextProps) {
  return <Text style={[typography[variant], { color: colors[color] }, style]} {...props} />;
}
