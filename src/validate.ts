export const validateCountryObject = (country: any) => {
  const errors: Record<string, string> = {};

  if (!country) {
    errors.general = "No country data provided";
    return { valid: false, errors };
  }

  if (!country.name || String(country.name).trim() === "") {
    errors.name = "is required";
  }

  if (
    country.population !== null &&
    country.population !== undefined &&
    (Number.isNaN(Number(country.population)) || Number(country.population) < 0)
  ) {
    errors.population = "must be a valid number or null";
  }

  if (
    country.currency_code &&
    String(country.currency_code).trim() === ""
  ) {
    errors.currency_code = "must be valid if provided";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export default {
  validateCountryObject
};