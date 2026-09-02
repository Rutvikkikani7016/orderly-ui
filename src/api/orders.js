import apiClient from './client';

export async function getOrders(params = {}) {
  const { data } = await apiClient.get('/orders', { params });
  return data.data; // { orders, pagination, metrics }
}

export async function getOrder(id) {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data.data;
}

export async function importOrdersCsv(formData) {
  const { data } = await apiClient.post('/orders/import-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data; // summary result
}
