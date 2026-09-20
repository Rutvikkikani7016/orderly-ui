import apiClient from './client';

export async function getSuperAdminOverview() {
  const { data } = await apiClient.get('/super-admin/overview');
  return data.data;
}

export async function getSuperAdminCompanies(params = {}) {
  const { data } = await apiClient.get('/super-admin/companies', { params });
  return data.data; // { companies, pagination }
}

export async function getSuperAdminCompany(id) {
  const { data } = await apiClient.get(`/super-admin/companies/${id}`);
  return data.data;
}

export async function updateCompanyStatusApi(id, status) {
  const { data } = await apiClient.patch(`/super-admin/companies/${id}/status`, { status });
  return data.data;
}

export async function updateCompanyApi(id, payload) {
  const { data } = await apiClient.put(`/super-admin/companies/${id}`, payload);
  return data.data;
}

export async function getSuperAdminUsers(params = {}) {
  const { data } = await apiClient.get('/super-admin/users', { params });
  return data.data; // { users, pagination }
}

export async function updateUserStatusApi(id, status) {
  const { data } = await apiClient.patch(`/super-admin/users/${id}/status`, { status });
  return data.data;
}

export async function updateUserRoleApi(id, role) {
  const { data } = await apiClient.patch(`/super-admin/users/${id}/role`, { role });
  return data.data;
}
