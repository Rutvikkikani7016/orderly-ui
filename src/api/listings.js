import apiClient from './client';

export async function getListings(params = {}) {
  const { data } = await apiClient.get('/listings', { params });
  return data.data;
}

export async function getListingMetrics() {
  const { data } = await apiClient.get('/listings/metrics');
  return data.data;
}

export async function mapListing(payload) {
  const { data } = await apiClient.post('/listings/map', payload);
  return data.data;
}

export async function updateListing(id, payload) {
  const { data } = await apiClient.patch(`/listings/${id}`, payload);
  return data.data;
}

export async function deleteListing(id) {
  const { data } = await apiClient.delete(`/listings/${id}`);
  return data.data;
}

export async function syncInventoryNow(id) {
  const { data } = await apiClient.post(`/listings/${id}/sync-inventory`);
  return data.data;
}
