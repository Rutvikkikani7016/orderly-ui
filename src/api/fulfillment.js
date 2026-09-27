import apiClient from './client';

/**
 * WMS Lite & Wave Picking
 */
export async function getPicklists(params = {}) {
  const { data } = await apiClient.get('/fulfillment/picklists', { params });
  return data.data; // { picklists, total, page, limit }
}

export async function getPicklistDetails(id) {
  const { data } = await apiClient.get(`/fulfillment/picklists/${id}`);
  return data.data;
}

export async function generateWavePicklist(payload) {
  const { data } = await apiClient.post('/fulfillment/picklists/generate', payload);
  return data.data;
}

export async function recordPickItem(itemId, quantityPicked) {
  const { data } = await apiClient.put(`/fulfillment/picklists/items/${itemId}`, { quantityPicked });
  return data.data;
}

/**
 * Packing Station & Shipping
 */
export async function verifyPackScan(payload) {
  const { data } = await apiClient.post('/fulfillment/pack/verify-scan', payload);
  return data; // returns full response with status & message
}

export async function bookShipment(payload) {
  const { data } = await apiClient.post('/fulfillment/shipments/book', payload);
  return data.data;
}

export async function getShipments(params = {}) {
  const { data } = await apiClient.get('/fulfillment/shipments', { params });
  return data.data; // { shipments, total, page, limit }
}

export async function getShipmentLabel(id) {
  const { data } = await apiClient.get(`/fulfillment/shipments/${id}/label`);
  return data.data;
}

/**
 * Carrier Handover Manifests
 */
export async function generateManifest(payload) {
  const { data } = await apiClient.post('/fulfillment/manifests/generate', payload);
  return data.data;
}

export async function getManifests(params = {}) {
  const { data } = await apiClient.get('/fulfillment/manifests', { params });
  return data.data;
}

/**
 * Centralized Audit Trail
 */
export async function getAuditLogs(params = {}) {
  const { data } = await apiClient.get('/audit/logs', { params });
  return data.data;
}
