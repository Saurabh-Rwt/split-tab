import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import authReducer        from './slices/authSlice';
import groupsReducer      from './slices/groupsSlice';
import expensesReducer    from './slices/expensesSlice';
import settlementsReducer from './slices/settlementsSlice';
import currencyReducer    from './slices/currencySlice';

//  Store
export const store = configureStore({
  reducer: {
    auth:        authReducer,
    groups:      groupsReducer,
    expenses:    expensesReducer,
    settlements: settlementsReducer,
    currency:    currencyReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch                 = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState>   = useSelector;