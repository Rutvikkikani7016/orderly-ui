import apiClient from './client';

/**
 * Returns & Reverse Logistics API Service
 */
export async function getReturns(params = {}) {
  const { data } = await apiClient.get('/returns', { params });
  return data.data; // { returns, total, page, limit, totalPages }
}

export async function getReturnDetails(id) {
  const { data } = await apiClient.get(`/returns/${id}`);
  return data.data;
}

export async function createReturn(payload) {
  const { data } = await apiClient.post('/returns', payload);
  return data.data;
}

export async function inwardScan(payload) {
  const { data } = await apiClient.post('/returns/inward/scan', payload);
  return data; // contains { status, message, data: { success, matched, returnOrder } }
}

export async function submitQcInspection(id, payload) {
  const { data } = await apiClient.put(`/returns/${id}/qc`, payload);
  return data.data;
}

export async function restockReturnItems(id, payload = {}) {
  const { data } = await apiClient.post(`/returns/${id}/restock`, payload);
  return data.data;
}

export async function getClaims(params = {}) {
  const { data } = await apiClient.get('/returns/claims', { params });
  return data.data; // { claims, total, page, limit, totalPages }
}

export async function fileClaim(payload) {
  const { data } = await apiClient.post('/returns/claims', payload);
  return data.data;
}

export async function updateClaim(id, payload) {
  const { data } = await apiClient.put(`/returns/claims/${id}`, payload);
  return data.data;
}
