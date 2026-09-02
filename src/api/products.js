import apiClient from './client';

export async function getProducts(params = {}) {
  const { data } = await apiClient.get('/products', { params });
  return data.data;
}

export async function getProduct(id) {
  const { data } = await apiClient.get(`/products/${id}`);
  return data.data;
}

export async function createProduct(productData) {
  const { data } = await apiClient.post('/products', productData);
  return data.data;
}

export async function updateProduct(id, productData) {
  const { data } = await apiClient.put(`/products/${id}`, productData);
  return data.data;
}

export async function deleteProduct(id) {
  const { data } = await apiClient.delete(`/products/${id}`);
  return data.data;
}
