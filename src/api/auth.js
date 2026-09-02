import apiClient from './client';

// Matches the backend contract from controllers/v1/auth.js:
// registerCompany(req, res, next) -> POST /api/v1/auth/register
// login(req, res, next)           -> POST /api/v1/auth/login
//
// Both expect { user, company, token } back on success.

export async function registerCompany(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data.data;
}

export async function login(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data.data;
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
}
