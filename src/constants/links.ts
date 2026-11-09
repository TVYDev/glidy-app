/**
 * Links shown in the menu. The website and the privacy policy page are the real glidy.app site
 * (the policy page itself has to exist at that address).
 *
 * TODO before release: the CONTACT values below are PLACEHOLDERS for the mock Contact screen.
 * Replace them with the real email address, Telegram link and Facebook page. Until then the rows
 * open links that may not exist or may belong to someone else.
 */
export const WEBSITE_URL = 'https://glidy.app';
export const PRIVACY_POLICY_URL = 'https://glidy.app/privacy';

export const CONTACT = {
  email: 'hello@glidy.app',
  telegramHandle: '@glidyapp',
  telegramUrl: 'https://t.me/glidyapp',
  facebookName: 'Glidy',
  facebookUrl: 'https://www.facebook.com/glidyapp',
} as const;
