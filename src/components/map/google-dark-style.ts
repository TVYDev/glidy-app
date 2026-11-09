import type { MapStyleElement } from 'react-native-maps';

/** A warm dark style for Google Maps, close to the app's dark palette. */
export const GOOGLE_DARK_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#242220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b9b2a4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1814' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4a463e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#b9b2a4' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#25301f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38342d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#242220' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9c9588' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#6b5a2c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2e2b26' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#14202a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5d7a8c' }] },
];
