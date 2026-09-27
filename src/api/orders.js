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

export async function getStateAnalytics(params = {}) {
  const { data } = await apiClient.get('/orders/state-analytics', { params });
  return data.data;
}

export async function transitionOrderStatus(id, payload) {
  const { data } = await apiClient.post(`/orders/${id}/transition`, payload);
  return data.data;
}

export async function holdOrder(id, payload) {
  const { data } = await apiClient.post(`/orders/${id}/hold`, payload);
  return data.data;
}

export async function releaseHold(id, payload = {}) {
  const { data } = await apiClient.post(`/orders/${id}/release`, payload);
  return data.data;
}

export async function cancelOrder(id, payload) {
  const { data } = await apiClient.post(`/orders/${id}/cancel`, payload);
  return data.data;
}

export async function getOrderTimeline(id) {
  const { data } = await apiClient.get(`/orders/${id}/timeline`);
  return data.data;
}

