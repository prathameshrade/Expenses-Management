import api from './api';

const currencyService = {
  async getExchangeRate(from: string, to: string): Promise<number> {
    try {
      const response = await api.get(`/currency/exchange-rate`, {
        params: { from, to },
      });
      return response.data.data.rate || 1;
    } catch {
      return 1; // Fallback to 1:1
    }
  },

  async getAllCountries() {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all');
      return await response.json();
    } catch {
      return [];
    }
  },
};

export default currencyService;