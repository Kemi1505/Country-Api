export const validateCountryObject = (country: any) => {
  const errors: Record<string, string> = {};

  if (!country) {
    errors.general = 'No country data provided';
    return { valid: false, errors };
  }

  if (!country.name || String(country.name).trim() === '') {
    errors.name = 'is required';
  }

  if (country.population == null || Number.isNaN(Number(country.population)) || Number(country.population) <= 0) {
    errors.population = 'must be a number greater than 0';
  }

  if ('currency_code' in country && (country.currency_code === null || String(country.currency_code).trim() === '')) {
    errors.currency_code = 'is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export default {
  validateCountryObject
};