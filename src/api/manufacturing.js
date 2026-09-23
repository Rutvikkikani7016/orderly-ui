import client from './client.js';

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

// Raw Materials
export async function getRawMaterials(params) {
  const response = await client.get('/raw-materials', { params });
  return unwrap(response);
}

export async function createRawMaterial(data) {
  const response = await client.post('/raw-materials', data);
  return unwrap(response);
}

export async function updateRawMaterial(id, data) {
  const response = await client.put(`/raw-materials/${id}`, data);
  return unwrap(response);
}

export async function deleteRawMaterial(id) {
  const response = await client.delete(`/raw-materials/${id}`);
  return unwrap(response);
}

// Suppliers
export async function getSuppliers() {
  const response = await client.get('/raw-materials/suppliers/list');
  return unwrap(response);
}

export async function createSupplier(data) {
  const response = await client.post('/raw-materials/suppliers', data);
  return unwrap(response);
}

export async function updateSupplier(id, data) {
  const response = await client.put(`/raw-materials/suppliers/${id}`, data);
  return unwrap(response);
}

export async function deleteSupplier(id) {
  const response = await client.delete(`/raw-materials/suppliers/${id}`);
  return unwrap(response);
}

// Material Categories
export async function getMaterialCategories() {
  const response = await client.get('/raw-materials/categories/list');
  return unwrap(response);
}

export async function createMaterialCategory(data) {
  const response = await client.post('/raw-materials/categories', data);
  return unwrap(response);
}

export async function updateMaterialCategory(id, data) {
  const response = await client.put(`/raw-materials/categories/${id}`, data);
  return unwrap(response);
}

export async function deleteMaterialCategory(id) {
  const response = await client.delete(`/raw-materials/categories/${id}`);
  return unwrap(response);
}

// Units of Measure (UOM)
export async function getUnitsOfMeasure() {
  const response = await client.get('/raw-materials/units/list');
  return unwrap(response);
}

export async function createUnitOfMeasure(data) {
  const response = await client.post('/raw-materials/units', data);
  return unwrap(response);
}

export async function updateUnitOfMeasure(id, data) {
  const response = await client.put(`/raw-materials/units/${id}`, data);
  return unwrap(response);
}

export async function deleteUnitOfMeasure(id) {
  const response = await client.delete(`/raw-materials/units/${id}`);
  return unwrap(response);
}

// Purchase Inward (Inventory Add + Moving Avg Rate calculation)
export async function recordPurchaseInward(data) {
  const response = await client.post('/raw-materials/purchases', data);
  return unwrap(response);
}

// Bill of Materials (BOM)
export async function getProductBom(productId) {
  const response = await client.get(`/manufacturing/bom/${productId}`);
  return unwrap(response);
}

export async function saveProductBom(productId, data) {
  const response = await client.post(`/manufacturing/bom/${productId}`, data);
  return unwrap(response);
}

// Production Batches
export async function getProductionBatches(params) {
  const response = await client.get('/manufacturing/batches', { params });
  return unwrap(response);
}

export async function createProductionBatch(data) {
  const response = await client.post('/manufacturing/batches', data);
  return unwrap(response);
}

export async function completeProductionBatch(id, data) {
  const response = await client.post(`/manufacturing/batches/${id}/complete`, data);
  return unwrap(response);
}

