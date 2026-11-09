import { SchematicMap } from '@/components/map/schematic-map';
import type { LiveMapProps } from '@/components/map/types';

/** react-native-maps has no web build here, so web always uses the schematic view. */
export function LiveMap(props: LiveMapProps) {
  return <SchematicMap {...props} />;
}
