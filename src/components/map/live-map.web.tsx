import { SchematicMap } from '@/components/map/schematic-map';
import type { LiveMapProps } from '@/components/map/types';

/** @rnmapbox/maps is native-only, so web always uses the schematic view. */
export function LiveMap(props: LiveMapProps) {
  return <SchematicMap {...props} />;
}
