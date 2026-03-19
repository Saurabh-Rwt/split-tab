import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CachedRates, Currency } from '../../types';
import { Storage, STORAGE_KEYS } from '../../utils/storage';
import { FrankfurterApi } from '../../services/frankfurterApi';

//  Constants
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

//  State
interface CurrencyState {
  rates:     CachedRates | null;
  isOffline: boolean;
  isLoading: boolean;
  error:     string | null;
}

const initialState: CurrencyState = {
  rates:     null,
  isOffline: false,
  isLoading: false,
  error:     null,
};

//  Thunks
export const hydrateCurrency = createAsyncThunk(
  'currency/hydrate',
  async (_, { dispatch }) => {
    const cached = await Storage.get<CachedRates>(STORAGE_KEYS.CURRENCY_RATES);

    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (ageMs < CACHE_TTL_MS) {
        // Cache is fresh
        return { rates: cached, isOffline: false };
      }
    }

    // Cache missing or stale fetch fresh rates
    try {
      const freshRates = await FrankfurterApi.fetchLatest();
      const newCache: CachedRates = {
        base:      'USD',
        rates:     freshRates,
        fetchedAt: new Date().toISOString(),
      };
      await Storage.set(STORAGE_KEYS.CURRENCY_RATES, newCache);
      return { rates: newCache, isOffline: false };
    } catch {
      // Network failed fall back to stale cache if available
      return {
        rates:     cached ?? null,
        isOffline: true,
      };
    }
  },
);

/**
 * Force refresh rates called manually or after 24hrs.
 */
export const refreshRates = createAsyncThunk(
  'currency/refresh',
  async () => {
    const freshRates = await FrankfurterApi.fetchLatest();
    const newCache: CachedRates = {
      base:      'USD',
      rates:     freshRates,
      fetchedAt: new Date().toISOString(),
    };
    await Storage.set(STORAGE_KEYS.CURRENCY_RATES, newCache);
    return newCache;
  },
);

//  Slice
const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {},
  extraReducers: builder => {

    // hydrateCurrency
    builder.addCase(hydrateCurrency.pending, state => {
      state.isLoading = true;
      state.error     = null;
    });
    builder.addCase(hydrateCurrency.fulfilled, (state, action) => {
      state.rates     = action.payload.rates;
      state.isOffline = action.payload.isOffline;
      state.isLoading = false;
    });
    builder.addCase(hydrateCurrency.rejected, state => {
      state.isLoading = false;
      state.isOffline = true;
    });

    // refreshRates
    builder.addCase(refreshRates.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(refreshRates.fulfilled, (state, action) => {
      state.rates     = action.payload;
      state.isOffline = false;
      state.isLoading = false;
    });
    builder.addCase(refreshRates.rejected, state => {
      state.isLoading = false;
      state.isOffline = true;
    });
  },
});

export default currencySlice.reducer;

//  Selectors
export const selectRates     = (state: { currency: CurrencyState }) => state.currency.rates;
export const selectIsOffline = (state: { currency: CurrencyState }) => state.currency.isOffline;
export const selectIsLoading = (state: { currency: CurrencyState }) => state.currency.isLoading;

//  Pure conversion helpers
export const convertAmount = (
  amount:  number,
  from:    Currency,
  to:      Currency,
  rates:   Record<string, number>,
): number => {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate   = rates[to]   ?? 1;
  // amount USD to target currency
  const inUSD = amount / fromRate;
  return parseFloat((inUSD * toRate).toFixed(2));
};

// Convert using historical rates for past expenses
export const convertWithHistoricalRate = (
  amount:          number,
  from:            Currency,
  to:              Currency,
  historicalRates: Record<string, number>,
): number => {
  if (from === to) return amount;
  const fromRate = historicalRates[from] ?? 1;
  const toRate   = historicalRates[to]   ?? 1;
  const inUSD    = amount / fromRate;
  return parseFloat((inUSD * toRate).toFixed(2));
};