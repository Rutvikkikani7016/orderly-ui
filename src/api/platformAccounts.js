import apiClient from './client';

export async function getPlatformAccounts() {
  const { data } = await apiClient.get('/platform-accounts');
  return data.data;
}

export async function selectPlatforms(platforms) {
  const { data } = await apiClient.post('/platform-accounts/select', { platforms });
  return data.data;
}
