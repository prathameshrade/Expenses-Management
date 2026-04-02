import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  dbPath: process.env.DB_PATH || "./data/expenses.db",
  exchangeRateApiBase: process.env.EXCHANGE_RATE_API_BASE || "https://api.exchangerate-api.com/v4/latest",
  countriesApi: process.env.COUNTRIES_API || "https://restcountries.com/v3.1/all?fields=name,currencies",
};
