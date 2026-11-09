import type { Avatar } from '@/lib/types';

/** Backgrounds for emoji avatars: the member colours plus brand amber. */
export const AVATAR_COLORS = [
  '#EFB708',
  '#2F7A4F',
  '#E07A1F',
  '#2D6CDF',
  '#B23A8A',
  '#0E8F8F',
  '#7A4FD0',
  '#C8402E',
] as const;

/** Emoji to pick from: travel, vehicles, animals and a few faces. */
export const AVATAR_EMOJIS = [
  '🚗', '🚙', '🏍️', '🚲', '🛵', '🚌', '✈️', '⛵',
  '🧭', '🗺️', '⛺', '🏔️', '🏝️', '🌅', '🌴', '🎒',
  '🦊', '🐼', '🐯', '🦁', '🐘', '🐒', '🦜', '🐢',
  '😀', '😎', '🤠', '🥳', '😊', '🙂', '🤩', '🧑‍🚀',
];

/** Largest accepted photo data URI, in characters. A 192 px JPEG is far below this. */
export const MAX_PHOTO_CHARS = 60_000;

const PHOTO_PREFIX = 'data:image/jpeg;base64,';
const COLOR = /^#[0-9a-fA-F]{6}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Turns whatever came back from the database into an Avatar, or null. Other people's avatars are
 * untrusted input that ends up on everyone's screen, so only a plain emoji on a hex colour, or a
 * small base64 JPEG, is accepted.
 */
export function parseAvatar(value: unknown): Avatar | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  if (v.kind === 'emoji' && typeof v.emoji === 'string' && typeof v.color === 'string') {
    const emoji = v.emoji.trim();
    if (emoji.length === 0 || emoji.length > 16 || !COLOR.test(v.color)) return null;
    return { kind: 'emoji', emoji, color: v.color };
  }

  if (v.kind === 'photo' && typeof v.uri === 'string') {
    const { uri } = v;
    if (uri.length > MAX_PHOTO_CHARS || !uri.startsWith(PHOTO_PREFIX)) return null;
    if (!BASE64.test(uri.slice(PHOTO_PREFIX.length))) return null;
    return { kind: 'photo', uri };
  }

  return null;
}

export const photoAvatar = (base64: string): Avatar => ({ kind: 'photo', uri: `${PHOTO_PREFIX}${base64}` });

export const sameAvatar = (a: Avatar | null | undefined, b: Avatar | null | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
