export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];
export const PAYABLE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];
export type ImageMimetype = string;

export const euCountryCodes = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export const stripeTaxIdTypes = [
  { countryCode: 'GB', type: 'gb_vat', label: 'UK VAT' },
  { countryCode: 'DE', type: 'eu_vat', label: 'German VAT' },
  { countryCode: 'FR', type: 'eu_vat', label: 'French VAT' },
  { countryCode: 'AT', type: 'eu_vat', label: 'Austrian VAT' },
];

const constants = {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PAYABLE_SUBSCRIPTION_STATUSES,
  billing: {
    euCountryCodes,
    stripeTaxIdTypes,
  },
  upload: {
    maxFilesPerRequest: 5,
    maxFileSize: 10 * 1024 * 1024,
    allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedMimetypeExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  avatar: {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export default constants;
