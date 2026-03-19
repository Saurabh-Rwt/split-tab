import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Group } from '../../types';
import { Storage, STORAGE_KEYS } from '../../utils/storage';

//  State
interface GroupsState {
  groups:    Group[];
  isLoading: boolean;
}

const initialState: GroupsState = {
  groups:    [],
  isLoading: false,
};

//  Helper — persist groups array to AsyncStorage
const persist = async (groups: Group[]) => {
  await Storage.set(STORAGE_KEYS.GROUPS, groups);
};

//  Thunks
export const hydrateGroups = createAsyncThunk('groups/hydrate', async () => {
  const saved = await Storage.get<Group[]>(STORAGE_KEYS.GROUPS);
  return saved ?? [];
});

// Create a new group
export const createGroup = createAsyncThunk(
  'groups/create',
  async (group: Group, { getState }) => {
    const state  = (getState() as { groups: GroupsState }).groups;
    const updated = [group, ...state.groups];
    await persist(updated);
    return group;
  },
);

// Update group details
export const updateGroup = createAsyncThunk(
  'groups/update',
  async (
    { id, changes }: { id: string; changes: Partial<Group> },
    { getState },
  ) => {
    const state   = (getState() as { groups: GroupsState }).groups;
    const updated = state.groups.map(g =>
      g.id === id
        ? { ...g, ...changes, updatedAt: new Date().toISOString() }
        : g,
    );
    await persist(updated);
    return { id, changes };
  },
);

// Archive a group
export const archiveGroup = createAsyncThunk(
  'groups/archive',
  async (id: string, { dispatch }) => {
    await dispatch(updateGroup({ id, changes: { isArchived: true } }));
    return id;
  },
);

// Unarchive a group

export const unarchiveGroup = createAsyncThunk(
  'groups/unarchive',
  async (id: string, { dispatch }) => {
    await dispatch(updateGroup({ id, changes: { isArchived: false } }));
    return id;
  },
);

// Permanently delete a group
export const deleteGroup = createAsyncThunk(
  'groups/delete',
  async (id: string, { getState }) => {
    const state   = (getState() as { groups: GroupsState }).groups;
    const updated = state.groups.filter(g => g.id !== id);
    await persist(updated);
    return id;
  },
);

//  Slice
const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {},
  extraReducers: builder => {

    // hydrate
    builder.addCase(hydrateGroups.fulfilled, (state, action) => {
      state.groups = action.payload;
    });

    // create
    builder.addCase(createGroup.fulfilled, (state, action) => {
      state.groups.unshift(action.payload);
    });

    // update
    builder.addCase(updateGroup.fulfilled, (state, action) => {
      const { id, changes } = action.payload;
      const idx = state.groups.findIndex(g => g.id === id);
      if (idx !== -1) {
        state.groups[idx] = {
          ...state.groups[idx],
          ...changes,
          updatedAt: new Date().toISOString(),
        };
      }
    });

    // delete
    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      state.groups = state.groups.filter(g => g.id !== action.payload);
    });
  },
});

export default groupsSlice.reducer;

//  Selectors
export const selectAllGroups      = (state: { groups: GroupsState }) => state.groups.groups;
export const selectActiveGroups   = (state: { groups: GroupsState }) => state.groups.groups.filter(g => !g.isArchived);
export const selectArchivedGroups = (state: { groups: GroupsState }) => state.groups.groups.filter(g => g.isArchived);
export const selectGroupById      = (id: string) =>
  (state: { groups: GroupsState }) => state.groups.groups.find(g => g.id === id);