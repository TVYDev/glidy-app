import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { MAX_PHOTO_CHARS, photoAvatar } from '@/lib/avatar';
import type { Avatar } from '@/lib/types';

export type PhotoResult =
  | { status: 'ok'; avatar: Avatar }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** Side of the stored square picture. Big enough to stay sharp at 84 pt on a 3x screen. */
const SIZE = 192;
const QUALITY = 0.6;

/**
 * Lets the user pick a photo (library) or take one (camera), crops it to a square, shrinks it to
 * 192 px and returns it as an avatar. The result is small (roughly 8 KB), so it is stored right
 * in the profile row and no file storage is needed.
 *
 * Throws only if the chosen image cannot be processed; cancelling, a refused permission and a
 * missing camera are ordinary results.
 */
export async function pickAvatarPhoto(source: 'library' | 'camera'): Promise<PhotoResult> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true, // shows the square crop UI
    aspect: [1, 1],
    quality: 1,
  };

  let picked: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    try {
      picked = await ImagePicker.launchCameraAsync(options);
    } catch {
      // Devices without a camera (such as the iOS Simulator) throw instead of returning.
      return { status: 'unavailable' };
    }
  } else {
    picked = await ImagePicker.launchImageLibraryAsync(options);
  }

  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return { status: 'cancelled' };

  // The crop screen hands back the whole photo if the user did not zoom, so do not rely on it for
  // the shape: load the photo, then cut the largest centred square out of it.
  const original = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const side = Math.min(original.width, original.height);
  const context = ImageManipulator.manipulate(original);
  context.crop({
    originX: Math.floor((original.width - side) / 2),
    originY: Math.floor((original.height - side) / 2),
    width: side,
    height: side,
  });
  context.resize({ width: SIZE, height: SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: QUALITY,
    base64: true,
  });

  if (!saved.base64) throw new Error('The image could not be encoded.');
  const avatar = photoAvatar(saved.base64);
  if (avatar.kind === 'photo' && avatar.uri.length > MAX_PHOTO_CHARS) throw new Error('The image is too large.');
  return { status: 'ok', avatar };
}
