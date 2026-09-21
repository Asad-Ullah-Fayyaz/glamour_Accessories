import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('axi_token');
    if (!token) {
      return null;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.success) {
        return res.user;
      }
      localStorage.removeItem('axi_token');
      return rejectWithValue('Failed to load user');
    } catch (err) {
      localStorage.removeItem('axi_token');
      return rejectWithValue(err.message || 'Error loading user');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        localStorage.setItem('axi_token', res.token);
        return res.user;
      }
      return rejectWithValue(res.message || 'Login failed');
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const adminLogin = createAsyncThunk(
  'auth/adminLogin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/admin-login', { email, password });
      if (res.success) {
        localStorage.setItem('axi_token', res.token);
        return res.user;
      }
      return rejectWithValue(res.message || 'Admin login failed');
    } catch (err) {
      return rejectWithValue(err.message || 'Admin login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      if (res.success) {
        localStorage.setItem('axi_token', res.token);
        return res.user;
      }
      return rejectWithValue(res.message || 'Registration failed');
    } catch (err) {
      return rejectWithValue(err.message || 'Registration failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      if (res.success) {
        return res.user;
      }
      return rejectWithValue('Failed to update profile');
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update profile');
    }
  }
);

const initialState = {
  user: null,
  loading: true,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      localStorage.removeItem('axi_token');
      state.user = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // loadUser
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload;
      })
      // login
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      // adminLogin
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      // register
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      // updateProfile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  }
});

export const { setUser, logout } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectIsAdmin = (state) =>
  state.auth.user?.role === 'admin' || state.auth.user?.role === 'superadmin';
export const selectIsSuperAdmin = (state) => state.auth.user?.role === 'superadmin';
export const selectAuthLoading = (state) => state.auth.loading;

export default authSlice.reducer;
