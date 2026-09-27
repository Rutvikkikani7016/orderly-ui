import client from './client';

export async function getStockPositions(params = {}) {
  const res = await client.get('/inventory/positions', { params });
  return res.data?.data || res.data;
}

export async function getLedgerHistory(params = {}) {
  const res = await client.get('/inventory/ledger', { params });
  return res.data?.data || res.data;
}

export async function adjustStock(data) {
  const res = await client.post('/inventory/adjust', data);
  return res.data?.data || res.data;
}

export async function inwardStock(data) {
  const res = await client.post('/inventory/inward', data);
  return res.data?.data || res.data;
}

export async function getWarehouses() {
  const res = await client.get('/inventory/warehouses');
  return res.data?.data || res.data;
}
