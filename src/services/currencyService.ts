import axios from "axios";
import { db } from "../db";
import { config } from "../config";

const cache = new Map<string, { fetchedAt: number; rates: Record<string, number> }>();
const TEN_MINUTES = 10 * 60 * 1000;

export async function getCountryCurrency(countryName: string): Promise<string> {
  const response = await axios.get(config.countriesApi);
  const countries = response.data as Array<{ name?: { common?: string }; currencies?: Record<string, unknown> }>;

  const found = countries.find((c) => c.name?.common?.toLowerCase() === countryName.toLowerCase());
  if (!found?.currencies) {
    throw new Error(`Could not resolve currency for country: ${countryName}`);
  }

  const currencyCode = Object.keys(found.currencies)[0];
  if (!currencyCode) {
    throw new Error(`No currency found for country: ${countryName}`);
  }

  return currencyCode;
}

async function getRates(baseCurrency: string): Promise<Record<string, number>> {
  const key = baseCurrency.toUpperCase();
  const current = cache.get(key);
  if (current && Date.now() - current.fetchedAt < TEN_MINUTES) {
    return current.rates;
  }

  const response = await axios.get(`${config.exchangeRateApiBase}/${key}`);
  const rates = response.data?.rates as Record<string, number>;
  if (!rates) {
    throw new Error("Failed to retrieve exchange rates");
  }

  cache.set(key, { fetchedAt: Date.now(), rates });
  return rates;
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return Number(amount.toFixed(2));
  }

  const rates = await getRates(from);
  const rate = rates[to];
  if (!rate) {
    throw new Error(`No conversion rate found for ${from} -> ${to}`);
  }

  return Number((amount * rate).toFixed(2));
}

export function companyCurrency(companyId: string): string {
  const row = db.prepare("SELECT currency FROM companies WHERE id = ?").get(companyId) as { currency: string } | undefined;
  if (!row) {
    throw new Error("Company not found");
  }

  return row.currency;
}
