import { Request, Response } from 'express';
import { refreshCountriesData } from './refreshService';
import { AppDataSource } from './configuration';
import { Country } from './country.entity';
import * as fs from 'fs';
import { getSummaryImagePath } from './summaryImage';

export const refreshCountries = async (req: Request, res: Response) => {
    try {
        const result = await refreshCountriesData();
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in refreshCountries controller:", error);
        if (error.status) {
            res.status(error.status).json({ error: error.error, details: error.details });
        } else {
            res.status(500).json({ error: "Internal server error", details: error.message });
        }
    }
};

export const getAllCountries = async (req: Request, res: Response) => {
    try {
        const { region, currency, sort } = req.query;
        const countryRepo = AppDataSource.getRepository(Country);

        const queryBuilder = countryRepo.createQueryBuilder("country");

        if (region) {
            queryBuilder.andWhere("LOWER(country.region) = LOWER(:region)", { region });
        }

        if (currency) {
            queryBuilder.andWhere("LOWER(country.currency_code) = LOWER(:currency)", { currency });
        }

        if (sort === "gdp_desc") {
            queryBuilder.orderBy("country.estimated_gdp", "DESC");
        }

        const countries = await queryBuilder.getMany();
        res.status(200).json(countries);

    } catch (error: any) {
        console.error("Error fetching countries:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getCountryByName = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const countryRepo = AppDataSource.getRepository(Country);

        const country = await countryRepo.findOne({
            where: { name }
        });

        if (!country) {
            return res.status(404).json({ error: "Country not found" });
        }

        res.status(200).json(country);

    } catch (error: any) {
        console.error("Error fetching country by name:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const deleteCountryByName = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const countryRepo = AppDataSource.getRepository(Country);

        const deleteResult = await countryRepo.delete({ name });

        if (deleteResult.affected === 0) {
            return res.status(404).json({ error: "Country not found" });
        }

        res.status(204).send();

    } catch (error: any) {
        console.error("Error deleting country:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getStatus = async (req: Request, res: Response) => {
    try {
        const countryRepo = AppDataSource.getRepository(Country);

        const totalCountries = await countryRepo.count();
        const latest = await countryRepo.find({
            order: { last_refreshed_at: "DESC" },
            take: 1
        });

        const lastRefreshedAt =
        latest.length > 0 && latest[0].last_refreshed_at
        ? latest[0].last_refreshed_at.toISOString()
        : null;

        res.status(200).json({
            total_countries: totalCountries,
            last_refreshed_at: lastRefreshedAt
        });

    } catch (error: any) {
        console.error("Error fetching status:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getSummaryImage = async (req: Request, res: Response) => {
    try {
        const imagePath = getSummaryImagePath();
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: "Summary image not found" });
        }

        res.sendFile(imagePath);

    } catch (error: any) {
        console.error("Error serving summary image:", error);
        res.status(500).json({ 
            error: "Internal server error", 
            details: error.message });
    }
};