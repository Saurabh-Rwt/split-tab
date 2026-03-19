import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Settlement } from '../../types';
import { Storage, STORAGE_KEYS } from '../../utils/storage';

//  State
interface SettlementsState {
  settlements: Settlement[];
}

const initialState: SettlementsState = {
  settlements: [],
};

//  Helper
const persist = async (settlements: Settlement[]) => {
  await Storage.set(STORAGE_KEYS.SETTLEMENTS, settlements);
};

//  Thunks
export const hydrateSettlements = createAsyncThunk(
  'settlements/hydrate',
  async () => {
    const saved = await Storage.get<Settlement[]>(STORAGE_KEYS.SETTLEMENTS);
    return saved ?? [];
  },
);

// Add a new settlement record
export const addSettlement = createAsyncThunk(
  'settlements/add',
  async (settlement: Settlement, { getState }) => {
    const state   = (getState() as { settlements: SettlementsState }).settlements;
    const updated = [settlement, ...state.settlements];
    await persist(updated);
    return settlement;
  },
);

// Slice
const settlementsSlice = createSlice({
  name: 'settlements',
  initialState,
  reducers: {},
  extraReducers: builder => {

    builder.addCase(hydrateSettlements.fulfilled, (state, action) => {
      state.settlements = action.payload;
    });

    builder.addCase(addSettlement.fulfilled, (state, action) => {
      state.settlements.unshift(action.payload);
    });
  },
});

export default settlementsSlice.reducer;

//  Selectors 
export const selectAllSettlements = (state: { settlements: SettlementsState }) =>
  state.settlements.settlements;

// All settlements for a specific group, newest first
export const selectSettlementsByGroup = (groupId: string) =>
  (state: { settlements: SettlementsState }) =>
    state.settlements.settlements
      .filter(s => s.groupId === groupId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// All settlements between two members in a specific group, newest first
export const selectSettlementsBetween = (
  groupId:   string,
  memberId1: string,
  memberId2: string,
) =>
  (state: { settlements: SettlementsState }) =>
    state.settlements.settlements
      .filter(
        s =>
          s.groupId === groupId &&
          ((s.fromId === memberId1 && s.toId === memberId2) ||
           (s.fromId === memberId2 && s.toId === memberId1)),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());