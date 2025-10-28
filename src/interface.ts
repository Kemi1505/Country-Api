export interface CountryApiData {
    name: string;
    capital: string | string[] | null;
    region: string | null;
    population: number;
    flag: string | null;
    currencies: { code: string; name: string; symbol: string }[] | null;
}

export interface ExchangeRatesApiData {
    result: string;
    provider: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    time_eol_unix: number;
    base_code: string;
    rates: { [key: string]: number };
}

export interface Country {
    id: number;
    name: string;
    capital: string | null;
    region: string | null;
    population: number;
    currency_code: string | null;
    exchange_rate: number | null;
    estimated_gdp: number | null;
    flag_url: string | null;
    last_refreshed_at: Date | null;
}