import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getOrders, importOrdersCsv, getStateAnalytics } from '../../api/orders.js';

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (customParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().orders;
      const params = {
        page: customParams.page || state.pagination.page,
        limit: customParams.limit || state.pagination.limit,
        platform: customParams.platform !== undefined ? customParams.platform : state.filters.platform,
        status: customParams.status !== undefined ? customParams.status : state.filters.status,
        search: customParams.search !== undefined ? customParams.search : state.filters.search,
        startDate: customParams.startDate !== undefined ? customParams.startDate : state.filters.startDate || undefined,
        endDate: customParams.endDate !== undefined ? customParams.endDate : state.filters.endDate || undefined,
      };

      const data = await getOrders(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const uploadOrdersCsv = createAsyncThunk(
  'orders/uploadOrdersCsv',
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const data = await importOrdersCsv(formData);
      dispatch(fetchOrders({ page: 1 }));
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to import CSV');
    }
  }
);

export const fetchMapAnalytics = createAsyncThunk(
  'orders/fetchMapAnalytics',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await getStateAnalytics(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch state analytics');
    }
  }
);

const initialState = {
  orders: [],
  metrics: {
    totalOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    pendingDispatch: 0,
    totalSales: 0,
    platformMetrics: [],
  },
  pagination: {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  },
  filters: {
    search: '',
    platform: 'all',
    status: 'all',
    datePreset: 'all',
    startDate: '',
    endDate: '',
  },
  stateAnalytics: [],
  loading: false,
  importing: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setSearch(state, action) {
      state.filters.search = action.payload;
    },
    setPlatformFilter(state, action) {
      state.filters.platform = action.payload;
    },
    setStatusFilter(state, action) {
      state.filters.status = action.payload;
    },
    setDateFilter(state, action) {
      const { preset, startDate, endDate } = action.payload;
      state.filters.datePreset = preset ?? state.filters.datePreset;
      state.filters.startDate = startDate ?? '';
      state.filters.endDate = endDate ?? '';
    },
    setPage(state, action) {
      state.pagination.page = action.payload;
    },
    setPageLimit(state, action) {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    resetFilters(state) {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchOrders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload?.orders || [];
        if (action.payload?.pagination) {
          state.pagination = action.payload.pagination;
        }
        if (action.payload?.metrics) {
          state.metrics = action.payload.metrics;
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // uploadOrdersCsv
      .addCase(uploadOrdersCsv.pending, (state) => {
        state.importing = true;
      })
      .addCase(uploadOrdersCsv.fulfilled, (state) => {
        state.importing = false;
      })
      .addCase(uploadOrdersCsv.rejected, (state, action) => {
        state.importing = false;
        state.error = action.payload;
      })
      // fetchMapAnalytics
      .addCase(fetchMapAnalytics.fulfilled, (state, action) => {
        state.stateAnalytics = action.payload || [];
      });
  },
});

export const {
  setSearch,
  setPlatformFilter,
  setStatusFilter,
  setDateFilter,
  setPage,
  setPageLimit,
  resetFilters,
} = orderSlice.actions;

export default orderSlice.reducer;
