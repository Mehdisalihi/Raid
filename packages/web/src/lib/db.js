import Dexie from 'dexie';

export const db = new Dexie('RaidAccountingDB');

db.version(1).stores({
  organizations: '++id, server_id, name',
  users: '++id, server_id, username, email, role',
  clients: '++id, server_id, organization_id, name, balance, sync_status',
  products: '++id, server_id, organization_id, name, code, quantity, sync_status',
  invoices: '++id, server_id, organization_id, client_id, total_amount, status, sync_status',
  invoice_items: '++id, server_id, invoice_id, product_id, sync_status',
  expenses: '++id, server_id, organization_id, title, amount, sync_status',
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
