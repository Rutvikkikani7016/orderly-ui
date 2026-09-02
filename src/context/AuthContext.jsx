import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext({
  user: null,
  company: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function verifyAuth() {
      const token = localStorage.getItem('orderly_token');
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setCompany(null);
        setLoading(false);
        return;
      }

      try {
        const data = await getMe();
        if (data && data.user) {
          setUser(data.user);
          setCompany(data.company);
          setIsAuthenticated(true);
          localStorage.setItem('orderly_user', JSON.stringify(data.user));
          if (data.company) {
            localStorage.setItem('orderly_company', JSON.stringify(data.company));
          }
        } else {
          throw new Error('Invalid response payload');
        }
      } catch (error) {
        localStorage.removeItem('orderly_token');
        localStorage.removeItem('orderly_user');
        localStorage.removeItem('orderly_company');
        setUser(null);
        setCompany(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  function logout() {
    localStorage.removeItem('orderly_token');
    localStorage.removeItem('orderly_user');
    localStorage.removeItem('orderly_company');
    setUser(null);
    setCompany(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ user, company, loading, isAuthenticated, logout, setUser, setCompany, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
