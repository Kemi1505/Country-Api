import axios from 'axios';
import pool from './configuration';
import { RowDataPacket } from 'mysql2/promise';
import { generateSummaryImage } from './summaryImage';
import { CountryApiData, ExchangeRatesApiData, Country } from './interface';

export const refreshCountriesData = async () => {
    const connection = await pool.getConnection(); 

    try {
        let countriesData: CountryApiData[];
        try {
            const countriesResponse = await axios.get<CountryApiData[]>('https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies');
            countriesData = countriesResponse.data;
        } catch (err: any) {
            console.error('Error fetching countries API:', err?.message || err);
            throw { 
                status: 503, 
                error: "External data source unavailable", 
                details: "Could not fetch data from restcountries.com" };
        }

        let exchangeRates: { [key: string]: number };
        try {
            const exchangeRatesResponse = await axios.get<ExchangeRatesApiData>('https://open.er-api.com/v6/latest/USD');
            const exchangeRatesData = exchangeRatesResponse.data as ExchangeRatesApiData;
            exchangeRates = exchangeRatesData.rates;
        } catch (err: any) {
            console.error('Error fetching exchange rates API:', err?.message || err);
            throw { 
                status: 503, 
                error: "External data source unavailable", 
                details: "Could not fetch data from open.er-api.com" };
        }

        if (!countriesData || !exchangeRates) {
            throw { status: 503, error: "External data source unavailable", details: "Missing data from external APIs" };
        }

        const refreshTimestamp = new Date();
        let totalCountries = 0;
        const countriesToProcess: Country[] = [];
        const gdpData: { name: string; gdp: number }[] = [];

        for (const countryApiData of countriesData) {
            const currencyInfo = countryApiData.currencies?.[0];
            const currencyCode = currencyInfo ? currencyInfo.code : null;

            if (!countryApiData.name || !countryApiData.population || !currencyCode) {
                console.warn(`Skipping country with missing required data: ${countryApiData.name}`);
                continue; // Skip
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

            countriesToProcess.push({
                id: 0,
                name: countryApiData.name,
                capital: capital,
                region: countryApiData.region || null,
                population: population,
                currency_code: currencyCode,
                exchange_rate: exchangeRate,
                estimated_gdp: estimatedGdp,
                flag_url: countryApiData.flag || null,
                last_refreshed_at: refreshTimestamp,
            });

            if (estimatedGdp && estimatedGdp > 0) {
                gdpData.push({ name: countryApiData.name, gdp: estimatedGdp });
            }
        }

        gdpData.sort((a, b) => b.gdp - a.gdp);
        const top5Gdp = gdpData.slice(0, 5);

        await generateSummaryImage({
            totalCountries,
            top5Gdp,
            lastRefreshedAt: refreshTimestamp.toISOString(),
        });

        await connection.beginTransaction();
        try {
            for (const countryData of countriesToProcess) {
                const [existingRows] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM countries WHERE LOWER(name) = LOWER(?) LIMIT 1',
                    [countryData.name]
                );

                if (existingRows && existingRows.length > 0) {
                    const existingId = (existingRows[0] as any).id;
                    const updateQuery = `
                        UPDATE countries
                        SET name = ?, capital = ?, region = ?, population = ?, currency_code = ?, exchange_rate = ?, estimated_gdp = ?, flag_url = ?, last_refreshed_at = ?
                        WHERE id = ?
                    `;
                    await connection.query(updateQuery, [
                        countryData.name,
                        countryData.capital,
                        countryData.region,
                        countryData.population,
                        countryData.currency_code,
                        countryData.exchange_rate,
                        countryData.estimated_gdp,
                        countryData.flag_url,
                        countryData.last_refreshed_at,
                        existingId
                    ]);
                } else {
                    const insertQuery = `
                        INSERT INTO countries (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.query(insertQuery, [
                        countryData.name,
                        countryData.capital,
                        countryData.region,
                        countryData.population,
                        countryData.currency_code,
                        countryData.exchange_rate,
                        countryData.estimated_gdp,
                        countryData.flag_url,
                        countryData.last_refreshed_at
                    ]);
                }
            }
            await connection.commit();
            return { message: "Countries data refreshed successfully" };

        } catch (dbError) {
            await connection.rollback();
            throw dbError; // Re-throw to be caught by the outer catch block
        } finally {
            connection.release(); // Release the connection back to the pool
        }

    } catch (error: any) {
        console.error("Error refreshing countries data:", error);
        if (error && typeof error === 'object' && 'status' in error) {
            throw error;
        } else if (error && typeof error === 'object' && error.message && String(error.message).includes("External data source unavailable")) {
            throw { 
                status: 503, 
                error: "External data source unavailable", 
                details: String(error.message) };
        } else {
            throw { 
                status: 500, 
                error: "Internal server error", 
                details: String(error) };
        }
    }
};