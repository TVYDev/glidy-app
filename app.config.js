// Extends app.json with the Google Maps key, which is read from the environment (.env.local) so it
// never lands in git. The key is baked into the native projects by `expo prebuild`, so after
// adding or changing it run `npx expo prebuild --clean` and rebuild the dev client.
const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // Without a key the app runs in demo mode with the schematic map, so the plugin is not needed.
    ...(key ? [['react-native-maps', { iosGoogleMapsApiKey: key, androidGoogleMapsApiKey: key }]] : []),
  ],
});
