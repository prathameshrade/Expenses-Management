import { useState, useEffect } from 'react';
import currencyService from '../services/currencyService';

export const useCurrency = () => {
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const convertCurrency = async (amount: number, from: string, to: string) => {
    if (from === to) return amount;

    setLoading(true);
    try {
      const rate = await currencyService.getExchangeRate(from, to);
      setExchangeRate(rate);
      return amount * rate;
    } finally {
      setLoading(false);
    }
  };

  return { convertCurrency, exchangeRate, loading };
};