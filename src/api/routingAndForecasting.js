import apiClient from './client';

/**
 * Smart Order Routing & Demand Forecasting API Service
 */
export async function getRoutingRules(params = {}) {
  const { data } = await apiClient.get('/routing-forecasting/routing-rules', { params });
  return data.data; // { rules, total, page, limit, totalPages }
}

export async function createRoutingRule(payload) {
  const { data } = await apiClient.post('/routing-forecasting/routing-rules', payload);
  return data.data;
}

export async function updateRoutingRule(id, payload) {
  const { data } = await apiClient.put(`/routing-forecasting/routing-rules/${id}`, payload);
  return data.data;
}

export async function deleteRoutingRule(id) {
  const { data } = await apiClient.delete(`/routing-forecasting/routing-rules/${id}`);
  return data.data;
}

export async function evaluateRouting(payload) {
  const { data } = await apiClient.post('/routing-forecasting/evaluate-routing', payload);
  return data.data; // { matched, routingType, ruleName, warehouseId, warehouseName, confidenceScore, reason }
}

export async function getForecastSummary(params = {}) {
  const { data } = await apiClient.get('/routing-forecasting/forecasts/summary', { params });
  return data.data;
}

export async function getForecasts(params = {}) {
  const { data } = await apiClient.get('/routing-forecasting/forecasts', { params });
  return data.data; // { forecasts, total, page, limit, totalPages }
}

export async function recalculateForecasts(payload = {}) {
  const { data } = await apiClient.post('/routing-forecasting/forecasts/recalculate', payload);
  return data.data;
}
