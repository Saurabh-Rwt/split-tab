const BASE_URL = 'https://api.frankfurter.dev/v1';

export interface FrankfurterResponse {
  base:  string;
  date:  string;
  rates: Record<string, number>;
}

export const FrankfurterApi = {
  async fetchLatest(): Promise<Record<string, number>> {
    const res = await fetch(`${BASE_URL}/latest?base=USD`);
    if (!res.ok) {
      throw new Error(`Frankfurter API error: ${res.status} ${res.statusText}`);
    }
    const data: FrankfurterResponse = await res.json();
    return { ...data.rates, USD: 1 };
  },

  async fetchHistorical(date: string): Promise<Record<string, number>> {
    const res = await fetch(`${BASE_URL}/${date}?base=USD`);

    if (!res.ok) {
      throw new Error(`Frankfurter historical error: ${res.status} ${res.statusText}`);
    }

    const data: FrankfurterResponse = await res.json();
    return { ...data.rates, USD: 1 };
  },
};