import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

export interface CountryPrefix {
  country: CountryCode;
  code: string;
  label: string;
}

// Common priority countries placed at top for fast access
const PRIORITY_COUNTRIES: CountryCode[] = [
  'RO', 'MD', 'HU', 'DE', 'GB', 'US', 'IT', 'ES', 'FR', 'AT',
  'UA', 'CH', 'BE', 'NL', 'BG', 'PL', 'GR', 'PT', 'TR', 'CA',
  'AU', 'IL'
];

export function getCountryPrefixes(): CountryPrefix[] {
  const allCountries = getCountries();
  const countryList: CountryPrefix[] = allCountries.map((c) => {
    const dialCode = `+${getCountryCallingCode(c)}`;
    return {
      country: c,
      code: dialCode,
      label: `${c} (${dialCode})`
    };
  });

  const prioritySet = new Set<string>(PRIORITY_COUNTRIES);
  const priorityList = PRIORITY_COUNTRIES
    .map((c) => countryList.find((item) => item.country === c))
    .filter((item): item is CountryPrefix => item !== undefined);

  const restList = countryList
    .filter((item) => !prioritySet.has(item.country))
    .sort((a, b) => a.country.localeCompare(b.country));

  return [...priorityList, ...restList];
}

export const COUNTRY_PREFIXES: CountryPrefix[] = getCountryPrefixes();
