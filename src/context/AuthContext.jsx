import { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  verifyAuth,
  setUser as setReduxUser,
  setCompany as setReduxCompany,
  setIsAuthenticated as setReduxAuth,
  logout as logoutRedux,
} from '../store/slices/authSlice.js';

const AuthContext = createContext({
  user: null,
  company: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
  setUser: () => {},
  setCompany: () => {},
  setIsAuthenticated: () => {},
});

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const { user, company, loading, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(verifyAuth());
  }, [dispatch]);

  const logout = () => {
    dispatch(logoutRedux());
  };

  const setUser = (userData) => {
    dispatch(setReduxUser(userData));
  };

  const setCompany = (companyData) => {
    dispatch(setReduxCompany(companyData));
  };

  const setIsAuthenticated = (authStatus) => {
    dispatch(setReduxAuth(authStatus));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        isAuthenticated,
        logout,
        setUser,
        setCompany,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

