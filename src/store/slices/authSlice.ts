import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';
import { Storage, STORAGE_KEYS } from '../../utils/storage';

//  State shape
interface AuthState {
  isLoggedIn:             boolean;
  user:                   User | null;
  hasCompletedOnboarding: boolean;
  isHydrated:             boolean;
}

const initialState: AuthState = {
  isLoggedIn:             false,
  user:                   null,
  hasCompletedOnboarding: false,
  isHydrated:             false,
};

//  Async thunks
export const hydrateAuth = createAsyncThunk('auth/hydrate', async () => {
  const saved = await Storage.get<AuthState>(STORAGE_KEYS.AUTH);
  return saved;
});

/** Saves user profile during onboarding (not yet logged in) */
export const saveUserProfile = createAsyncThunk(
  'auth/saveUserProfile',
  async (user: User, { getState }) => {
    const state = (getState() as { auth: AuthState }).auth;
    await Storage.set(STORAGE_KEYS.AUTH, {
      ...state,
      user,
      hasCompletedOnboarding: true,
    });
    return user;
  },
);

/** Login */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (user: User) => {
    const next: AuthState = {
      isLoggedIn:             true,
      user,
      hasCompletedOnboarding: true,
      isHydrated:             true,
    };
    await Storage.set(STORAGE_KEYS.AUTH, next);
    return next;
  },
);

/** Logout */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await Storage.clear();
});

/** Update user profile */
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (partial: Partial<User>, { getState }) => {
    const state   = (getState() as { auth: AuthState }).auth;
    const updated = { ...state.user!, ...partial };
    await Storage.set(STORAGE_KEYS.AUTH, { ...state, user: updated });
    return updated;
  },
);

//  Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // hydrate
    builder.addCase(hydrateAuth.fulfilled, (state, action) => {
      if (action.payload) {
        state.isLoggedIn             = action.payload.isLoggedIn;
        state.user                   = action.payload.user;
        state.hasCompletedOnboarding = action.payload.hasCompletedOnboarding;
      }
      state.isHydrated = true;
    });
    builder.addCase(hydrateAuth.rejected, state => {
      state.isHydrated = true;
    });

    // saveUserProfile
    builder.addCase(saveUserProfile.fulfilled, (state, action) => {
      state.user                   = action.payload;
      state.hasCompletedOnboarding = true;
    });

    // loginUser
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isLoggedIn             = action.payload.isLoggedIn;
      state.user                   = action.payload.user;
      state.hasCompletedOnboarding = action.payload.hasCompletedOnboarding;
    });

    // logoutUser
    builder.addCase(logoutUser.fulfilled, state => {
      state.isLoggedIn             = false;
      state.user                   = null;
      state.hasCompletedOnboarding = false;
    });

    // updateUserProfile
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });
  },
});

export default authSlice.reducer;

export const selectIsLoggedIn             = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectUser                   = (state: { auth: AuthState }) => state.auth.user;
export const selectHasCompletedOnboarding = (state: { auth: AuthState }) => state.auth.hasCompletedOnboarding;
export const selectIsHydrated             = (state: { auth: AuthState }) => state.auth.isHydrated;