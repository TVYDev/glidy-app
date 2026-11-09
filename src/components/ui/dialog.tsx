import type { LucideIcon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export type ConfirmOptions = {
  title: string;
  body?: string;
  /** Label of the confirming button. Defaults to "OK". */
  confirmLabel?: string;
  /** Label of the other button; `null` shows only the confirming one (a notice). */
  cancelLabel?: string | null;
  /** The confirming action cannot be undone: it is drawn as a red button. */
  destructive?: boolean;
  /** A Lucide icon for the round badge above the title. */
  icon?: LucideIcon;
};

type DialogApi = {
  /** Resolves true when the user confirms, false when they cancel or tap outside. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

/**
 * App-styled replacement for the system alert: a rounded card on a dimmed backdrop, in the app's
 * fonts, colours and language. Use `useDialog().confirm(...)` and await the answer.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // The last dialog shown, kept while its card fades out so the text does not vanish first.
  const [last, setLast] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    // A dialog opened over another one settles the first as cancelled.
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(next);
      setLast(next);
    });
  }, []);

  const close = useCallback((answer: boolean) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
  }, []);

  const api = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <DialogView options={options} last={last} onClose={close} />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside DialogProvider');
  return api;
}

function DialogView({
  options,
  last,
  onClose,
}: {
  options: ConfirmOptions | null;
  last: ConfirmOptions | null;
  onClose: (answer: boolean) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const current = options ?? last;

  return (
    <Modal
      visible={options !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => onClose(false)}
    >
      {options && current && (
        <View style={styles.root}>
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              accessibilityLabel={t('common.cancel')}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,18,14,0.55)' }]}
              onPress={() => onClose(false)}
            />
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            accessibilityViewIsModal
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            {current.icon && <IconBadge icon={current.icon} size={56} />}
            <ThemedText type="subtitle" style={styles.title}>
              {current.title}
            </ThemedText>
            {current.body ? (
              <ThemedText themeColor="textSecondary" style={styles.body}>
                {current.body}
              </ThemedText>
            ) : null}

            <View style={styles.actions}>
              <Button
                label={current.confirmLabel ?? t('common.ok')}
                variant={current.destructive ? 'destructive' : 'ink'}
                onPress={() => onClose(true)}
              />
              {current.cancelLabel !== null && (
                <Button
                  label={current.cancelLabel ?? t('common.cancel')}
                  variant="secondary"
                  onPress={() => onClose(false)}
                />
              )}
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  title: { textAlign: 'center', fontSize: 24, lineHeight: 30 },
  body: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.one },
});
