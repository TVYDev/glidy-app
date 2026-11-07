import { StyleSheet, Text, type TextProps } from 'react-native';

import {
  KHMER_LINE_HEIGHT_SCALE,
  ThemeColor,
  fontFamilyFor,
} from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'caption';
  themeColor?: ThemeColor;
};

/**
 * App text. Picks Exo 2 (English) or Kantumruy Pro (Khmer) by the current language and maps
 * `fontWeight` to the matching font file, since native fonts have one family per weight.
 */
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { language } = useI18n();

  const flat = StyleSheet.flatten([styles[type], style]) ?? {};
  const { fontWeight, lineHeight, ...others } = flat;

  return (
    <Text
      {...rest}
      style={[
        { color: type === 'linkPrimary' ? theme.primaryDark : theme[themeColor ?? 'text'] },
        others,
        {
          fontFamily: fontFamilyFor(language, fontWeight),
          lineHeight:
            lineHeight != null && language === 'km' ? lineHeight * KHMER_LINE_HEIGHT_SCALE : lineHeight,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
  default: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  title: { fontSize: 40, lineHeight: 46, fontWeight: 700 },
  subtitle: { fontSize: 30, lineHeight: 36, fontWeight: 700 },
  link: { lineHeight: 30, fontSize: 14, fontWeight: 600 },
  linkPrimary: { lineHeight: 30, fontSize: 14, fontWeight: 600 },
  code: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
});
