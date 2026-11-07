import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, View, type ColorValue, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/**
 * True when the system can draw real liquid glass (iOS 26+ built with the new SDK). Computed once:
 * some early iOS 26 betas lack the API and crash if it is used, hence the extra runtime check.
 */
export const hasLiquidGlass: boolean = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();

type GlassProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
  /** Solid colour used where liquid glass is not available (Android, older iOS). */
  fallbackColor: ColorValue;
  /** Optional hairline border for the fallback surface. */
  fallbackBorderColor?: ColorValue;
  /** Subtle tint for the glass itself. */
  tintColor?: ColorValue;
  glassStyle?: 'regular' | 'clear';
  interactive?: boolean;
};

/**
 * Liquid glass surface on iOS 26, a plain solid surface elsewhere. Give it a `borderRadius` in
 * `style` for the shape. Children are drawn on top of the glass.
 */
export function Glass({
  style,
  fallbackColor,
  fallbackBorderColor,
  tintColor,
  glassStyle = 'regular',
  interactive,
  children,
  ...rest
}: GlassProps) {
  if (hasLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor={tintColor}
        isInteractive={interactive}
        style={style}
        {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        style,
        { backgroundColor: fallbackColor },
        fallbackBorderColor ? { borderWidth: 1, borderColor: fallbackBorderColor } : null,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
