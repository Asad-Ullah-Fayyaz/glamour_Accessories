import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api';
import { setUser as setReduxUser, logout as reduxLogout, selectCurrentUser, selectAuthLoading } from '../store/slices/authSlice';
import { initializeCart, resetCartState } from '../store/slices/cartSlice';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const reduxUser = useSelector(selectCurrentUser);
  const reduxLoading = useSelector(selectAuthLoading);

  const [user, setUser] = useState(reduxUser);
  const [token, setToken] = useState(localStorage.getItem('axi_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync internal user state with Redux user state
  useEffect(() => {
    setUser(reduxUser);
  }, [reduxUser]);

  // Fetch current user details on mount or when token changes
  useEffect(() => {
    let ignore = false;

    const loadUser = async () => {
      if (!token) {
        dispatch(setReduxUser(null));
        dispatch(initializeCart());
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (!ignore && res.success) {
          setUser(res.user);
          dispatch(setReduxUser(res.user));
          await dispatch(initializeCart());
        }
      } catch (err) {
        if (!ignore) {
          localStorage.removeItem('axi_token');
          setToken(null);
          setUser(null);
          dispatch(setReduxUser(null));
          dispatch(initializeCart());
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadUser();

    return () => {
      ignore = true;
    };
  }, [token, dispatch]);

  // Handle multi-tab storage sync
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== 'axi_token') return;
      if (!event.newValue) {
        setUser(null);
        dispatch(setReduxUser(null));
        dispatch(resetCartState());
      }
      setToken(event.newValue);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dispatch]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('axi_token', res.token);
      setToken(res.token);
      setUser(res.user);
      dispatch(setReduxUser(res.user));
      await dispatch(initializeCart());
    }
    return res;
  };

  const adminLogin = async (email, password) => {
    const res = await api.post('/auth/admin-login', { email, password });
    if (res.success) {
      localStorage.setItem('axi_token', res.token);
      setToken(res.token);
      setUser(res.user);
      dispatch(setReduxUser(res.user));
      await dispatch(initializeCart());
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success) {
      localStorage.setItem('axi_token', res.token);
      setToken(res.token);
      setUser(res.user);
      dispatch(setReduxUser(res.user));
      await dispatch(initializeCart());
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('axi_token');
    setToken(null);
    setUser(null);
    dispatch(reduxLogout());
    dispatch(resetCartState());
  };

  const updateProfile = async (profileData) => {
    const res = await api.put('/auth/profile', profileData);
    if (res.success) {
      setUser(res.user);
      dispatch(setReduxUser(res.user));
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || reduxUser,
        token,
        loading: loading && reduxLoading,
        isAuthenticated: !!(user || reduxUser),
        isAdmin: (user || reduxUser)?.role === 'admin' || (user || reduxUser)?.role === 'superadmin',
        isSuperAdmin: (user || reduxUser)?.role === 'superadmin',
        login,
        adminLogin,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
