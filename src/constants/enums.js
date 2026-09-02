export const USER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const COMPANY_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
};

export const PLATFORM = {
  FLIPKART: 'flipkart',
  AMAZON: 'amazon',
  MEESHO: 'meesho',
  MYNTRA: 'myntra',
};

export const PLATFORM_ACCOUNT_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending',
};

export const ORDER_STATUS = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RTO_INITIATED: 'rto_initiated',
  RTO_DELIVERED: 'rto_delivered',
  RETURNED: 'returned',
  EXCHANGED: 'exchanged',
};

export const PAYMENT_MODE = {
  PREPAID: 'prepaid',
  COD: 'cod',
};

export const RECONCILIATION_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  PARTIAL: 'partial',
  UNMATCHED: 'unmatched',
  DISPUTED: 'disputed',
};

export const SETTLEMENT_LINE_TYPE = {
  SALE: 'sale',
  RETURN: 'return',
  CANCELLATION: 'cancellation',
  ADJUSTMENT: 'adjustment',
};

export const SYNC_JOB_TYPE = {
  ORDER_SYNC: 'order_sync',
  ORDER_WEBHOOK: 'order_webhook',
  SETTLEMENT_IMPORT: 'settlement_import',
  RECONCILIATION_MATCH: 'reconciliation_match',
};

export const SYNC_JOB_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const SETTLEMENT_SOURCE_TYPE = {
  API: 'api',
  CSV_UPLOAD: 'csv_upload',
};

export const STATUS_HISTORY_SOURCE = {
  WEBHOOK: 'webhook',
  POLL: 'poll',
  MANUAL: 'manual',
};

export const PLATFORMS_LIST = Object.values(PLATFORM);
