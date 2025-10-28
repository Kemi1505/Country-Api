import axios from "axios";
import { AppDataSource } from "./configuration";
import { Country } from "./country.entity";
import { generateSummaryImage } from "./summaryImage";
import { CountryApiData, ExchangeRatesApiData } from "./interface";

export const refreshCountriesData = async () => {
  const countryRepo = AppDataSource.getRepository(Country);

  try {
    // Fetch Countries
    const countriesResponse = await axios.get<CountryApiData[]>(
      "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies"
    );
    const countriesData = countriesResponse.data;

    // Fetch Exchange Rates
    const exchangeRatesResponse = await axios.get<ExchangeRatesApiData>(
      "https://open.er-api.com/v6/latest/USD"
    );
    const exchangeRatesData = exchangeRatesResponse.data;
    const exchangeRates = exchangeRatesData.rates;

    const refreshTimestamp = new Date();
    const gdpData: { name: string; gdp: number }[] = [];
    let totalCountries = 0;

    await AppDataSource.transaction(async (transactionalManager) => {
      for (const countryApiData of countriesData) {
        totalCountries++;

        // Name handling with fallback
        const name =
          countryApiData.name &&
          String(countryApiData.name).trim() !== ""
            ? countryApiData.name.trim()
            : "Unknown Country";

        const population =
          typeof countryApiData.population === "number"
            ? countryApiData.population
            : 0;

        const currencyInfo = countryApiData.currencies?.[0];
        const currencyCode =
          currencyInfo && currencyInfo.code ? currencyInfo.code : null;

        let exchangeRate: number | null = null;
        if (currencyCode && exchangeRates[currencyCode]) {
          exchangeRate = exchangeRates[currencyCode];
        }

        let estimatedGdp = 0;
        if (population > 0 && exchangeRate !== null) {
          const multiplier =
            Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
          estimatedGdp = (population * multiplier) / exchangeRate;
        }

        let capital: string | null = null;
        if (countryApiData.capital) {
          capital = Array.isArray(countryApiData.capital)
            ? countryApiData.capital[0]
            : countryApiData.capital;
        }

        const existing = await transactionalManager.findOne(Country, {
          where: { name },
        });

        if (existing) {
          existing.capital = capital;
          existing.region = countryApiData.region || null;
          existing.population = population;
          existing.currency_code = currencyCode;
          existing.exchange_rate = exchangeRate;
          existing.estimated_gdp = estimatedGdp;
          existing.flag_url = countryApiData.flag || null;
          existing.last_refreshed_at = refreshTimestamp;
          await transactionalManager.save(existing);
        } else {
          const newCountry = transactionalManager.create(Country, {
            name,
            capital,
            region: countryApiData.region || null,
            population,
            currency_code: currencyCode,
            exchange_rate: exchangeRate,
            estimated_gdp: estimatedGdp,
            flag_url: countryApiData.flag || null,
            last_refreshed_at: refreshTimestamp,
          });
          await transactionalManager.save(newCountry);
        }

        if (estimatedGdp > 0) {
          gdpData.push({ name, gdp: estimatedGdp });
        }
      }
    });

    gdpData.sort((a, b) => b.gdp - a.gdp);
    const top5Gdp = gdpData.slice(0, 5);

    await generateSummaryImage({
      totalCountries,
      top5Gdp,
      lastRefreshedAt: refreshTimestamp.toISOString(),
    });

    return { message: "Countries refreshed successfully", totalCountries };
  } catch (error: any) {
    console.error("Error refreshing countries data:", error);
    throw {
      status: 503,
      error: "External data source unavailable",
      details: error?.message || String(error),
    };
  }
};
