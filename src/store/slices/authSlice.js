import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMe, login as loginApi, registerCompany as registerApi } from '../../api/auth.js';

const getInitialToken = () =>
  localStorage.getItem('ordernest_token') || localStorage.getItem('orderly_token') || null;

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('ordernest_user') || localStorage.getItem('orderly_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialCompany = () => {
  try {
    const raw = localStorage.getItem('ordernest_company') || localStorage.getItem('orderly_company');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const verifyAuth = createAsyncThunk('auth/verifyAuth', async (_, { rejectWithValue }) => {
  const token = getInitialToken();
  if (!token) {
    return rejectWithValue('No token found');
  }
  try {
    const data = await getMe();
    if (data && data.user) {
      localStorage.setItem('ordernest_token', token);
      localStorage.setItem('ordernest_user', JSON.stringify(data.user));
      if (data.company) {
        localStorage.setItem('ordernest_company', JSON.stringify(data.company));
      }
      return data;
    }
    return rejectWithValue('Invalid response payload');
  } catch (err) {
    localStorage.removeItem('ordernest_token');
    localStorage.removeItem('ordernest_user');
    localStorage.removeItem('ordernest_company');
    localStorage.removeItem('orderly_token');
    localStorage.removeItem('orderly_user');
    localStorage.removeItem('orderly_company');
    return rejectWithValue(err.response?.data?.message || err.message || 'Session expired');
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    const data = await loginApi(credentials);
    if (data && data.token) {
      localStorage.setItem('ordernest_token', data.token);
      localStorage.setItem('ordernest_user', JSON.stringify(data.user));
      if (data.company) {
        localStorage.setItem('ordernest_company', JSON.stringify(data.company));
      }
      return data;
    }
    return rejectWithValue('Invalid login response');
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, { rejectWithValue }) => {
  try {
    const data = await registerApi(payload);
    if (data && data.token) {
      localStorage.setItem('ordernest_token', data.token);
      localStorage.setItem('ordernest_user', JSON.stringify(data.user));
      if (data.company) {
        localStorage.setItem('ordernest_company', JSON.stringify(data.company));
      }
      return data;
    }
    return rejectWithValue('Invalid registration response');
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

const initialState = {
  token: getInitialToken(),
  user: getInitialUser(),
  company: getInitialCompany(),
  isAuthenticated: Boolean(getInitialToken()),
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem('ordernest_user', JSON.stringify(action.payload));
      }
    },
    setCompany(state, action) {
      state.company = action.payload;
      if (action.payload) {
        localStorage.setItem('ordernest_company', JSON.stringify(action.payload));
      }
    },
    setIsAuthenticated(state, action) {
      state.isAuthenticated = action.payload;
    },
    setCredentials(state, action) {
      const { user, company, token } = action.payload;
      state.user = user || null;
      state.company = company || null;
      state.token = token || null;
      state.isAuthenticated = Boolean(token);
      state.loading = false;
      if (token) {
        localStorage.setItem('ordernest_token', token);
        if (user) localStorage.setItem('ordernest_user', JSON.stringify(user));
        if (company) localStorage.setItem('ordernest_company', JSON.stringify(company));
      }
    },
    logout(state) {
      localStorage.removeItem('ordernest_token');
      localStorage.removeItem('ordernest_user');
      localStorage.removeItem('ordernest_company');
      localStorage.removeItem('orderly_token');
      localStorage.removeItem('orderly_user');
      localStorage.removeItem('orderly_company');
      state.user = null;
      state.company = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // verifyAuth
      .addCase(verifyAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.company = action.payload.company || null;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyAuth.rejected, (state, action) => {
        state.user = null;
        state.company = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = action.payload;
      })
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.company = action.payload.company || null;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // registerUser
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.company = action.payload.company || null;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setUser, setCompany, setIsAuthenticated, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
