export function parsePhoneNumberFromString(number: string, country?: string) {
  return {
    isValid: () => true,
    formatInternational: () => number,
    formatNational: () => number,
  };
}
