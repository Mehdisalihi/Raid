import Dexie from 'dexie';

export const db = new Dexie('RaidAccountingDB');

db.version(4).stores({
  organizations: '++id, server_id, name',
  users: '++id, server_id, username, email, role',
  clients: '++id, server_id, organization_id, name, balance, role, sync_status',
  products: '++id, server_id, organization_id, name, barcode, stockQty, sync_status',
  invoices: '++id, server_id, organization_id, customerId, finalAmount, status, type, sync_status',
  invoice_items: '++id, server_id, invoice_id, product_id, sync_status',
  expenses: '++id, server_id, organization_id, title, amount, category, date, sync_status',
  warehouses: '++id, server_id, organization_id, name, location, manager, sync_status',
  suppliers: '++id, server_id, organization_id, name, phone, email, balance, sync_status',
  sales: '++id, server_id, organization_id, invoiceNo, customerId, type, sync_status',
  purchases: '++id, server_id, organization_id, invoiceNo, supplierId, type, sync_status',
  returns: '++id, server_id, organization_id, saleId, total, sync_status',
  debts_debtors: '++id, server_id, customerId, amount, remaining',
  debts_creditors: '++id, server_id, supplierId, amount, remaining',
  expense_categories: '++id, server_id, name',
  cached_stats: 'key',
  sync_outbox: '++id, organization_id, table_name, record_id, action, processed'
});

// Keep old versions for migration compatibility
db.version(3).stores({
  organizations: '++id, server_id, name',
  users: '++id, server_id, username, email, role',
  clients: '++id, server_id, organization_id, name, balance, role, sync_status',
  products: '++id, server_id, organization_id, name, barcode, stockQty, sync_status',
  invoices: '++id, server_id, organization_id, customerId, finalAmount, status, type, sync_status',
  invoice_items: '++id, server_id, invoice_id, product_id, sync_status',
  expenses: '++id, server_id, organization_id, title, amount, category, date, sync_status',
  warehouses: '++id, server_id, organization_id, name, location, manager, sync_status',
  sync_outbox: '++id, organization_id, table_name, record_id, action, processed'
});

// Helper to add to outbox
export async function addToOutbox(tableName, recordId, action, payload, organizationId) {
  return await db.sync_outbox.add({
    organization_id: organizationId,
    table_name: tableName,
    record_id: recordId,
    action: action,
    payload: payload,
    processed: 0,
    created_at: new Date().toISOString()
  });
}

// Helper to get pending outbox count
export async function getPendingCount() {
  try {
    return await db.sync_outbox.where('processed').equals(0).count();
  } catch {
    return 0;
  }
}

// Helper to cache API response data into a local table
export async function cacheApiData(tableName, dataArray) {
  if (!db[tableName] || !Array.isArray(dataArray)) return;
  try {
    for (const item of dataArray) {
      await db[tableName].put({
        ...item,
        server_id: item.id,
        sync_status: 'synced'
      });
    }
  } catch (e) {
    console.warn(`Failed to cache ${tableName}:`, e);
  }
}

// Helper to read local fallback data
export async function getLocalData(tableName) {
  if (!db[tableName]) return [];
  try {
    return await db[tableName].toArray();
  } catch (e) {
    console.warn(`Failed to read local ${tableName}:`, e);
    return [];
  }
}
