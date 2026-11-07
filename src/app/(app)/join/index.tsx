import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';

/** Pulls the group code out of a scanned QR value: a glidyapp://join/CODE link or a bare code. */
function parseCode(value: string): string | null {
  const match = value.trim().match(/join\/([A-Za-z0-9]{4,10})/) ?? value.trim().match(/^([A-Za-z0-9]{4,10})$/);
  return match ? match[1].toUpperCase() : null;
}

export default function JoinScreen() {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  function go(value: string) {
    router.replace({ pathname: '/join/[code]', params: { code: value } });
  }

  function onScanned(result: BarcodeScanningResult) {
    if (handled.current) return;
    const parsed = parseCode(result.data);
    if (!parsed) return;
    handled.current = true;
    go(parsed);
  }

  async function startScan() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    handled.current = false;
    setScanning(true);
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        Enter the 6-character code from your group leader, or scan their QR code.
      </ThemedText>

      <TextField
        label="Group code"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        placeholder="ABC123"
        returnKeyType="go"
        onSubmitEditing={() => code.length >= 4 && go(code)}
      />
      <Button label="Continue" onPress={() => go(code)} disabled={code.length < 4} />

      {scanning ? (
        <View style={styles.camera}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        </View>
      ) : (
        <Button
          label="Scan QR code"
          variant="accent"
          icon={{ sf: 'qrcode.viewfinder', md: 'qr_code_scanner' }}
          onPress={startScan}
        />
      )}

      {permission && !permission.granted && !permission.canAskAgain && (
        <Button label="Allow camera in Settings" variant="ghost" compact onPress={() => Linking.openSettings()} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  camera: { height: 320, borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.two },
});
