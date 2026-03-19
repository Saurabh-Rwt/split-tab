import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage] set error — "${key}"`, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`[Storage] remove error — "${key}"`, e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('[Storage] clear error', e);
    }
  },
};

export const STORAGE_KEYS = {
  AUTH:           'splittab_auth',
  GROUPS:         'splittab_groups',
  EXPENSES:       'splittab_expenses',
  SETTLEMENTS:    'splittab_settlements',
  CURRENCY_RATES: 'splittab_currency_rates',
  LOCATION_CACHE: 'splittab_location_cache',
};