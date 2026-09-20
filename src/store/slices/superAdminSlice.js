import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSuperAdminOverview,
  getSuperAdminCompanies,
  getSuperAdminCompany,
  updateCompanyStatusApi,
  updateCompanyApi,
  getSuperAdminUsers,
  updateUserStatusApi,
  updateUserRoleApi,
} from '../../api/superAdmin.js';

export const fetchOverview = createAsyncThunk(
  'superAdmin/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getSuperAdminOverview();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch overview metrics');
    }
  }
);

export const fetchCompanies = createAsyncThunk(
  'superAdmin/fetchCompanies',
  async (customParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().superAdmin;
      const params = {
        page: customParams.page || state.companiesPagination.page,
        limit: customParams.limit || state.companiesPagination.limit,
        status: customParams.status !== undefined ? customParams.status : state.companiesFilter.status,
        search: customParams.search !== undefined ? customParams.search : state.companiesFilter.search,
      };
      const data = await getSuperAdminCompanies(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch companies');
    }
  }
);

export const fetchCompanyDetails = createAsyncThunk(
  'superAdmin/fetchCompanyDetails',
  async (id, { rejectWithValue }) => {
    try {
      const data = await getSuperAdminCompany(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch company details');
    }
  }
);

export const changeCompanyStatus = createAsyncThunk(
  'superAdmin/changeCompanyStatus',
  async ({ id, status }, { dispatch, rejectWithValue }) => {
    try {
      const data = await updateCompanyStatusApi(id, status);
      dispatch(fetchCompanies());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update company status');
    }
  }
);

export const saveCompany = createAsyncThunk(
  'superAdmin/saveCompany',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const data = await updateCompanyApi(id, payload);
      dispatch(fetchCompanies());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update company');
    }
  }
);

export const fetchUsers = createAsyncThunk(
  'superAdmin/fetchUsers',
  async (customParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().superAdmin;
      const params = {
        page: customParams.page || state.usersPagination.page,
        limit: customParams.limit || state.usersPagination.limit,
        role: customParams.role !== undefined ? customParams.role : state.usersFilter.role,
        status: customParams.status !== undefined ? customParams.status : state.usersFilter.status,
        search: customParams.search !== undefined ? customParams.search : state.usersFilter.search,
        companyId: customParams.companyId !== undefined ? customParams.companyId : state.usersFilter.companyId || undefined,
      };
      const data = await getSuperAdminUsers(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const changeUserStatus = createAsyncThunk(
  'superAdmin/changeUserStatus',
  async ({ id, status }, { dispatch, rejectWithValue }) => {
    try {
      const data = await updateUserStatusApi(id, status);
      dispatch(fetchUsers());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update user status');
    }
  }
);

export const changeUserRole = createAsyncThunk(
  'superAdmin/changeUserRole',
  async ({ id, role }, { dispatch, rejectWithValue }) => {
    try {
      const data = await updateUserRoleApi(id, role);
      dispatch(fetchUsers());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update user role');
    }
  }
);

const initialState = {
  overview: {
    metrics: null,
    platformDistribution: [],
    recentCompanies: [],
  },
  companies: [],
  selectedCompany: null,
  companiesPagination: {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  },
  companiesFilter: {
    search: '',
    status: 'all',
  },
  users: [],
  usersPagination: {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  },
  usersFilter: {
    search: '',
    role: 'all',
    status: 'all',
    companyId: '',
  },
  loading: false,
  actionLoading: false,
  error: null,
};

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    setCompaniesSearch(state, action) {
      state.companiesFilter.search = action.payload;
    },
    setCompaniesStatusFilter(state, action) {
      state.companiesFilter.status = action.payload;
    },
    setCompaniesPage(state, action) {
      state.companiesPagination.page = action.payload;
    },
    setCompaniesPageLimit(state, action) {
      state.companiesPagination.limit = action.payload;
      state.companiesPagination.page = 1;
    },
    setUsersSearch(state, action) {
      state.usersFilter.search = action.payload;
    },
    setUsersRoleFilter(state, action) {
      state.usersFilter.role = action.payload;
    },
    setUsersStatusFilter(state, action) {
      state.usersFilter.status = action.payload;
    },
    setUsersCompanyIdFilter(state, action) {
      state.usersFilter.companyId = action.payload;
    },
    setUsersPage(state, action) {
      state.usersPagination.page = action.payload;
    },
    setUsersPageLimit(state, action) {
      state.usersPagination.limit = action.payload;
      state.usersPagination.page = 1;
    },
    setSelectedCompany(state, action) {
      state.selectedCompany = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchOverview
      .addCase(fetchOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload || initialState.overview;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchCompanies
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload?.companies || [];
        if (action.payload?.pagination) {
          state.companiesPagination = action.payload.pagination;
        }
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchCompanyDetails
      .addCase(fetchCompanyDetails.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(fetchCompanyDetails.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selectedCompany = action.payload;
      })
      .addCase(fetchCompanyDetails.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload?.users || [];
        if (action.payload?.pagination) {
          state.usersPagination = action.payload.pagination;
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setCompaniesSearch,
  setCompaniesStatusFilter,
  setCompaniesPage,
  setCompaniesPageLimit,
  setUsersSearch,
  setUsersRoleFilter,
  setUsersStatusFilter,
  setUsersCompanyIdFilter,
  setUsersPage,
  setUsersPageLimit,
  setSelectedCompany,
} = superAdminSlice.actions;

export default superAdminSlice.reducer;
