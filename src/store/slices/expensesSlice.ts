import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Expense, AuditEntry } from '../../types';
import { Storage, STORAGE_KEYS } from '../../utils/storage';
import uuid from 'react-native-uuid';

//  State
interface ExpensesState {
  expenses: Expense[];
  isLoading: boolean;
}

const initialState: ExpensesState = {
  expenses: [],
  isLoading: false,
};

//  Helper
const persist = async (expenses: Expense[]) => {
  await Storage.set(STORAGE_KEYS.EXPENSES, expenses);
};

//  Thunks
export const hydrateExpenses = createAsyncThunk('expenses/hydrate', async () => {
  const saved = await Storage.get<Expense[]>(STORAGE_KEYS.EXPENSES);
  return saved ?? [];
});

//Add a new expense
export const addExpense = createAsyncThunk(
  'expenses/add',
  async (expense: Expense, { getState }) => {
    const state = (getState() as { expenses: ExpensesState }).expenses;
    const updated = [expense, ...state.expenses];
    await persist(updated);
    return expense;
  },
);

// Edit an existing expense
export const editExpense = createAsyncThunk(
  'expenses/edit',
  async (
    {
      id,
      changes,
      changedBy,
      changeDescription,
    }: {
      id: string;
      changes: Partial<Expense>;
      changedBy: string;
      changeDescription: string;
    },
    { getState },
  ) => {
    const state = (getState() as { expenses: ExpensesState }).expenses;
    const existing = state.expenses.find(e => e.id === id);
    if (!existing) throw new Error(`Expense ${id} not found`);

    // Build audit entry with previous values of changed fields
    const previousValues: Partial<Expense> = {};
    for (const key of Object.keys(changes) as (keyof Expense)[]) {
      (previousValues as any)[key] = existing[key];
    }

    const auditEntry: AuditEntry = {
      id: uuid.v4() as string,
      changedAt: new Date().toISOString(),
      changedBy,
      description: changeDescription,
      previousValues,
    };

    const updated = state.expenses.map(e =>
      e.id === id
        ? {
          ...e,
          ...changes,
          updatedAt: new Date().toISOString(),
          auditLog: [...e.auditLog, auditEntry],
        }
        : e,
    );

    await persist(updated);
    return { id, changes, auditEntry };
  },
);

// Delete an expense by ID
export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: string, { getState }) => {
    const state = (getState() as { expenses: ExpensesState }).expenses;
    const updated = state.expenses.filter(e => e.id !== id);
    await persist(updated);
    return id;
  },
);

//  Slice

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {},
  extraReducers: builder => {

    // hydrate
    builder.addCase(hydrateExpenses.fulfilled, (state, action) => {
      state.expenses = action.payload;
    });

    // add
    builder.addCase(addExpense.fulfilled, (state, action) => {
      state.expenses.unshift(action.payload);
    });

    // edit
    builder.addCase(editExpense.fulfilled, (state, action) => {
      const { id, changes, auditEntry } = action.payload;
      const idx = state.expenses.findIndex(e => e.id === id);
      if (idx !== -1) {
        state.expenses[idx] = {
          ...state.expenses[idx],
          ...changes,
          updatedAt: new Date().toISOString(),
          auditLog: [...state.expenses[idx].auditLog, auditEntry],
        };
      }
    });

    // delete
    builder.addCase(deleteExpense.fulfilled, (state, action) => {
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    });
  },
});

export default expensesSlice.reducer;

//  Selectors

export const selectAllExpenses = (state: { expenses: ExpensesState }) =>
  state.expenses.expenses;

export const selectExpenseById = (id: string) =>
  (state: { expenses: ExpensesState }) =>
    state.expenses.expenses.find(e => e.id === id);

export const selectExpensesByGroup = (groupId: string) =>
  (state: { expenses: ExpensesState }) =>
    state.expenses.expenses
      .filter(e => e.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());