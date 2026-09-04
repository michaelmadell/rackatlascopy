export function checkVAT(vat: string, countries?: any[]) {
  return {
    isValid: true,
    country: { name: 'United Kingdom', isoCode: { short: 'GB' } },
  };
}

export const countries = [];
