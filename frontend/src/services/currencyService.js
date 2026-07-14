import axios from 'axios';

const EXCHANGE_RATES_API = 'https://api.exchangerate-api.com/v4/latest/EUR';

const CurrencyService = {
  /**
   * Get latest exchange rates with EUR as base
   */
  getLatestRates: async () => {
    try {
      const response = await axios.get(EXCHANGE_RATES_API);
      return response.data.rates;
    } catch (error) {
      console.warn('Erreur lors de la récupération des taux de change, utilisation des taux de secours');
      return {
        'EUR': 1,
        'USD': 1.08,
        'GBP': 0.85,
        'TND': 3.40
      };
    }
  },

  /**
   * Format currency value
   */
  format: (value, currency = 'EUR', language = 'fr-FR') => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency,
    }).format(value);
  },

  /**
   * Convert value between currencies
   */
  convert: (value, fromCurrency, toCurrency, rates) => {
    if (!rates || fromCurrency === toCurrency) return value;
    
    // Convert to base (EUR)
    const baseValue = value / rates[fromCurrency];
    // Convert to target
    return baseValue * rates[toCurrency];
  }
};

export default CurrencyService;
