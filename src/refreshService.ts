import axios from "axios";
import { AppDataSource } from "./configuration";
import { Country } from "./country.entity";
import { generateSummaryImage } from "./summaryImage";
import { CountryApiData, ExchangeRatesApiData } from "./interface";

export const refreshCountriesData = async () => {
  const countryRepo = AppDataSource.getRepository(Country);

  try {
    let countriesData: CountryApiData[];
    try {
      const countriesResponse = await axios.get<CountryApiData[]>(
        "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies"
      );
      countriesData = countriesResponse.data;
    } catch (err: any) {
      console.error("Error fetching countries API:", err?.message || err);
      throw {
        status: 503,
        error: "External data source unavailable",
        details: "Could not fetch data from restcountries.com",
      };
    }

    let exchangeRates: { [key: string]: number };
    try {
      const exchangeRatesResponse = await axios.get<ExchangeRatesApiData>(
        "https://open.er-api.com/v6/latest/USD"
      );
      const exchangeRatesData = exchangeRatesResponse.data as ExchangeRatesApiData;
      exchangeRates = exchangeRatesData.rates;
    } catch (err: any) {
      console.error("Error fetching exchange rates API:", err?.message || err);
      throw {
        status: 503,
        error: "External data source unavailable",
        details: "Could not fetch data from open.er-api.com",
      };
    }

    if (!countriesData || !exchangeRates) {
      throw {
        status: 503,
        error: "External data source unavailable",
        details: "Missing data from external APIs",
      };
    }

    const refreshTimestamp = new Date();
    let totalCountries = 0;
    const gdpData: { name: string; gdp: number }[] = [];

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      for (const countryApiData of countriesData) {
        const currencyInfo = countryApiData.currencies?.[0];
        const currencyCode = currencyInfo ? currencyInfo.code : null;

        if (!countryApiData.name || !countryApiData.population || !currencyCode) {
          console.warn(
            `Skipping country with missing required data: ${countryApiData.name}`
          );
          continue;
        }

        totalCountries++;

        let exchangeRate = null;
        if (currencyCode && exchangeRates[currencyCode]) {
          exchangeRate = exchangeRates[currencyCode];
        }

        const population = countryApiData.population;
        let estimatedGdp: number | null = null;

        if (population && exchangeRate !== null) {
          const multiplier = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
          estimatedGdp = (population * multiplier) / exchangeRate;
        }

        let capital: string | null = null;
        if (countryApiData.capital) {
          if (Array.isArray(countryApiData.capital)) {
            capital = countryApiData.capital[0];
          } else {
            capital = countryApiData.capital;
          }
        }

        let existing = await transactionalEntityManager.findOne(Country, {
          where: { name: countryApiData.name },
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

          await transactionalEntityManager.save(existing);
        } else {
          const newCountry = transactionalEntityManager.create(Country, {
            name: countryApiData.name,
            capital,
            region: countryApiData.region || null,
            population,
            currency_code: currencyCode,
            exchange_rate: exchangeRate,
            estimated_gdp: estimatedGdp,
            flag_url: countryApiData.flag || null,
            last_refreshed_at: refreshTimestamp,
          });

          await transactionalEntityManager.save(newCountry);
        }

        if (estimatedGdp && estimatedGdp > 0) {
          gdpData.push({ name: countryApiData.name, gdp: estimatedGdp });
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

    return { message: "Countries data refreshed successfully" };
  } catch (error: any) {
    console.error("Error refreshing countries data:", error);

    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }

    if (
      error &&
      typeof error === "object" &&
      error.message &&
      String(error.message).includes("External data source unavailable")
    ) {
      throw {
        status: 503,
        error: "External data source unavailable",
        details: String(error.message),
      };
    }

    throw {
      status: 500,
      error: "Internal server error",
      details: String(error),
    };
  }

  
};
