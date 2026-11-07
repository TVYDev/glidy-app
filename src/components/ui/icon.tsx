import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = SymbolViewProps['name'];
type SfName = Extract<SymbolName, string>;
type MdName = NonNullable<Extract<SymbolName, object>['android']>;

type IconProps = {
  /** SF Symbol name (iOS). */
  sf: SfName;
  /** Material Symbol name (Android and web). */
  md: MdName;
  size?: number;
  color?: ThemeColor | (string & {});
  style?: StyleProp<ViewStyle>;
};

/** Cross-platform icon: SF Symbols on iOS, Material Symbols elsewhere. */
export function Icon({ sf, md, size = 22, color = 'text', style }: IconProps) {
  const theme = useTheme();
  const tintColor = color in theme ? theme[color as ThemeColor] : color;
  return (
    <SymbolView
      name={{ ios: sf, android: md, web: md }}
      size={size}
      tintColor={tintColor}
      style={[{ width: size, height: size }, style]}
    />
  );
}
