import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getPlatformAccounts,
  selectPlatforms as selectPlatformsApi,
  disconnectPlatformAccount as disconnectApi,
} from '../../api/platformAccounts.js';

export const fetchPlatformAccounts = createAsyncThunk(
  'platforms/fetchPlatformAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getPlatformAccounts();
      return data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch platform accounts');
    }
  }
);

export const selectPlatforms = createAsyncThunk(
  'platforms/selectPlatforms',
  async (platforms, { dispatch, rejectWithValue }) => {
    try {
      const data = await selectPlatformsApi(platforms);
      dispatch(fetchPlatformAccounts());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update platform selections');
    }
  }
);

export const disconnectPlatform = createAsyncThunk(
  'platforms/disconnectPlatform',
  async (platformAccountId, { dispatch, rejectWithValue }) => {
    try {
      const data = await disconnectApi(platformAccountId);
      dispatch(fetchPlatformAccounts());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to disconnect platform');
    }
  }
);

const initialState = {
  accounts: [],
  connectedPlatforms: [],
  loading: false,
  error: null,
};

const platformSlice = createSlice({
  name: 'platforms',
  initialState,
  reducers: {
    setConnectedPlatforms(state, action) {
      state.connectedPlatforms = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatformAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlatformAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
        state.connectedPlatforms = action.payload.map((a) => (a.platform || '').toLowerCase());
      })
      .addCase(fetchPlatformAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setConnectedPlatforms } = platformSlice.actions;
export default platformSlice.reducer;
