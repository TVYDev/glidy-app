import { StyleSheet, Text, type TextProps } from 'react-native';

import {
  KHMER_LINE_HEIGHT_SCALE,
  ThemeColor,
  DISPLAY_FONT,
  fontFamilyFor,
  scaleText,
  type Language,
} from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTextScale } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'display' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'caption';
  themeColor?: ThemeColor;
  /**
   * Write this text in the given language's font, regardless of the app language. For text that is
   * always in one language, such as the "ខ្មែរ" label on the language switch: Exo 2 has no Khmer
   * glyphs, so it would fall back to a system font with the wrong spacing.
   */
  fontLanguage?: Language;
};

/**
 * App text. Picks Exo 2 (English) or Kantumruy Pro (Khmer) by the current language and maps
 * `fontWeight` to the matching font file, since native fonts have one family per weight.
 */
export function ThemedText({ style, type = 'default', themeColor, fontLanguage, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { language: appLanguage } = useI18n();
  const language = fontLanguage ?? appLanguage;
  const scale = useTextScale();

  const flat = StyleSheet.flatten([styles[type], style]) ?? {};
  const { fontWeight, lineHeight, fontSize: baseSize, ...others } = flat;
  // Moul (the Khmer display face) is much wider than Exo 2, so it is set smaller to fit the same space.
  const fontSize = baseSize != null && type === 'display' && language === 'km' ? baseSize * 0.62 : baseSize;

  return (
    <Text
      {...rest}
      style={[
        { color: type === 'linkPrimary' ? theme.primaryDark : theme[themeColor ?? 'text'] },
        others,
        {
          fontFamily: type === 'display' ? DISPLAY_FONT[language] : fontFamilyFor(language, fontWeight),
          fontSize: fontSize != null ? scaleText(fontSize, scale) : undefined,
          lineHeight:
            lineHeight != null
              ? scaleText(lineHeight, scale) * (language === 'km' ? KHMER_LINE_HEIGHT_SCALE : 1)
              : undefined,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 13, lineHeight: 18, fontWeight: 500 },
  small: { fontSize: 15, lineHeight: 21, fontWeight: 500 },
  smallBold: { fontSize: 15, lineHeight: 21, fontWeight: 700 },
  default: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  display: { fontSize: 38, lineHeight: 42, fontWeight: 800 },
  title: { fontSize: 40, lineHeight: 46, fontWeight: 700 },
  subtitle: { fontSize: 30, lineHeight: 36, fontWeight: 700 },
  link: { lineHeight: 30, fontSize: 15, fontWeight: 600 },
  linkPrimary: { lineHeight: 30, fontSize: 15, fontWeight: 600 },
  code: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
});
