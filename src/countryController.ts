import { Request, Response } from 'express';
import { refreshCountriesData } from './refreshService';
import pool from './configuration';
import { RowDataPacket } from 'mysql2/promise';
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
        const connection = await pool.getConnection();

        try {
            let query = `
                SELECT id, name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at
                FROM countries
            `;
            const queryParams: any[] = [];

            // Apply filters (case-insensitive)
            if (region) {
                query += " WHERE LOWER(region) = LOWER(?)";
                queryParams.push(region);
            }
            if (currency) {
                if (region) {
                    query += " AND LOWER(currency_code) = LOWER(?)";
                } else {
                    query += " WHERE LOWER(currency_code) = LOWER(?)";
                }
                queryParams.push(currency);
            }

            // Apply sorting: only allow gdp_desc to prevent injection
            if (sort === 'gdp_desc') {
                query += " ORDER BY estimated_gdp DESC";
            }

            const [rows] = await connection.query<RowDataPacket[]>(query, queryParams);
            res.status(200).json(rows);

        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error("Error fetching countries:", error);
        res.status(500).json({ 
            error: "Internal server error", 
            details: error.message });
    }
};

export const getCountryByName = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        const { name } = req.params;

        try {
            const query = `
                SELECT id, name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at
                FROM countries
                WHERE LOWER(name) = LOWER(?)
            `;
            const [rows] = await connection.query<RowDataPacket[]>(query, [name]);

            if (rows.length === 0) {
                return res.status(404).json({ error: "Country not found" });
            }

            res.status(200).json(rows[0]);
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error("Error fetching country by name:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const deleteCountryByName = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        const { name } = req.params;

        try {
            const query = `DELETE FROM countries WHERE LOWER(name) = LOWER(?)`;
            const [result] = await connection.query<any>(query, [name]); // Use 'any' for result type as it varies

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Country not found" });
            }

            res.status(204).send();
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error("Error deleting country by name:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getStatus = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        try {
            // Get total countries
            const [countRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as total_countries FROM countries');
            const totalCountries = countRows[0].total_countries;

            const [latestCountryRows] = await connection.query<RowDataPacket[]>(
                'SELECT last_refreshed_at FROM countries ORDER BY last_refreshed_at DESC LIMIT 1'
            );
            const lastRefreshedAt = latestCountryRows.length > 0 ? latestCountryRows[0].last_refreshed_at : null;

            res.status(200).json({
                total_countries: totalCountries,
                last_refreshed_at: lastRefreshedAt ? new Date(lastRefreshedAt).toISOString() : null
            });
        } finally {
            connection.release();
        }
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