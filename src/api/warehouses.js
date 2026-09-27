import apiClient from './client';

export async function getWarehousesList(params = {}) {
  const { data } = await apiClient.get('/warehouses', { params });
  return data.data; // { warehouses, total, page, limit }
}

export async function getWarehouse(id) {
  const { data } = await apiClient.get(`/warehouses/${id}`);
  return data.data;
}

export async function createWarehouse(payload) {
  const { data } = await apiClient.post('/warehouses', payload);
  return data.data;
}

export async function updateWarehouse(id, payload) {
  const { data } = await apiClient.put(`/warehouses/${id}`, payload);
  return data.data;
}

export async function setPrimaryWarehouse(id) {
  const { data } = await apiClient.patch(`/warehouses/${id}/set-primary`);
  return data.data;
}

export async function deleteWarehouse(id) {
  const { data } = await apiClient.delete(`/warehouses/${id}`);
  return data;
}
