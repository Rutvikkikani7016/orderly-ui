import apiClient from './client';

/**
 * Financial Reconciliation & True Payout API Service
 */
export async function getReconciliationSummary(params = {}) {
  const { data } = await apiClient.get('/reconciliation/summary', { params });
  return data.data;
}

export async function getReconciliations(params = {}) {
  const { data } = await apiClient.get('/reconciliation', { params });
  return data.data; // { reconciliations, total, page, limit, totalPages }
}

export async function getSettlements(params = {}) {
  const { data } = await apiClient.get('/reconciliation/settlements', { params });
  return data.data; // { settlements, total, page, limit, totalPages }
}

export async function importSettlement(payload) {
  const { data } = await apiClient.post('/reconciliation/settlements/import', payload);
  return data.data;
}

export async function resolveDiscrepancy(id, payload) {
  const { data } = await apiClient.put(`/reconciliation/${id}/resolve`, payload);
  return data.data;
}
