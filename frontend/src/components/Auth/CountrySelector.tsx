import React, { useState, useEffect } from 'react';
import currencyService from '../../services/currencyService';

interface CountrySelectorProps {
  value: string;
  onChange: (country: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange }) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await currencyService.getAllCountries();
        const sorted = data
          .sort((a: any, b: any) => (a.name.common || '').localeCompare(b.name.common || ''))
          .map((c: any) => ({
            code: c.cca2,
            name: c.name.common,
            flag: c.flag,
          }));
        setCountries(sorted);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  if (loading) {
    return <select disabled>Loading countries...</select>;
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select a country</option>
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.flag} {country.name}
        </option>
      ))}
    </select>
  );
};

export default CountrySelector;