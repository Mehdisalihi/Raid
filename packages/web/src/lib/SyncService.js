import { db, cacheApiData, getLocalData } from './db';
import api from './api';

export const SyncService = {
  async syncNow() {
    if (!navigator.onLine) return;
    
    console.log("🔄 Starting sync process...");
    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      console.log("✅ Sync completed successfully.");
    } catch (error) {
      console.error("❌ Sync failed:", error);
    }
  },

  async pushLocalChanges() {
    const pendingChanges = await db.sync_outbox
      .where('processed')
      .equals(0)
      .toArray();

    for (const change of pendingChanges) {
      const { table_name, action, payload, record_id, id: outboxId } = change;
      
      try {
        if (action === 'INSERT') {
          const { id, sync_status, ...cleanPayload } = payload || {};
          const response = await api.post(`/${table_name}`, cleanPayload);
          
          if (db[table_name]) {
            try {
              await db[table_name].update(record_id, { 
                server_id: response.data?.id, 
                sync_status: 'synced' 
              });
            } catch (e) {
              console.warn(`Could not update local record for ${table_name}:`, e);
            }
          }
        } 
        else if (action === 'UPDATE') {
          const idToUse = payload?.server_id || record_id;
          const { id, server_id, sync_status, ...cleanPayload } = payload || {};
          await api.put(`/${table_name}/${idToUse}`, cleanPayload);
          if (db[table_name]) {
            try {
              await db[table_name].update(record_id, { sync_status: 'synced' });
            } catch (e) {}
          }
        }
        else if (action === 'DELETE') {
          const idToUse = payload?.server_id || record_id;
          if (idToUse && !idToUse.toString().startsWith('local_')) {
            await api.delete(`/${table_name}/${idToUse}`);
          }
        }

        await db.sync_outbox.update(outboxId, { processed: 1 });
      } catch (err) {
        console.error(`Error pushing ${table_name}:`, err);
        // If server returns 404 on update/delete, consider it processed
        if (err.response?.status === 404) {
           await db.sync_outbox.update(outboxId, { processed: 1 });
        }
      }
    }
  },

  async pullRemoteChanges() {
    const tables = [
      { api: 'clients', local: 'clients' },
      { api: 'products', local: 'products' },
      { api: 'invoices', local: 'invoices' },
      { api: 'expenses', local: 'expenses' },
      { api: 'warehouses', local: 'warehouses' },
      { api: 'suppliers', local: 'suppliers' },
      { api: 'sales', local: 'sales' },
      { api: 'purchases', local: 'purchases' },
      { api: 'returns', local: 'returns' },
    ];
    
    const specialRoutes = [
      { api: 'debts/debtors', local: 'debts_debtors' },
      { api: 'debts/creditors', local: 'debts_creditors' },
      { api: 'expenses/categories', local: 'expense_categories' },
    ];

    const lastSync = localStorage.getItem('raid_last_sync') || '1970-01-01T00:00:00Z';
    const newSyncTime = new Date().toISOString();

    // Pull standard tables
    for (const { api: apiPath, local: localTable } of tables) {
      try {
        const response = await api.get(`/${apiPath}`, {
          params: { updated_at: lastSync }
        });

        const data = response.data;
        if (data && Array.isArray(data) && data.length > 0) {
          await cacheApiData(localTable, data);
        }
      } catch (error) {
        console.warn(`Pull ${apiPath} skipped (offline or error):`, error.message);
      }
    }

    // Pull special routes
    for (const { api: apiPath, local: localTable } of specialRoutes) {
      try {
        const response = await api.get(`/${apiPath}`);
        const data = response.data;
        if (data && Array.isArray(data) && data.length > 0) {
          await cacheApiData(localTable, data);
        }
      } catch (error) {
        console.warn(`Pull ${apiPath} skipped:`, error.message);
      }
    }

    // Pull and cache dashboard stats
    try {
      const statsRes = await api.get('/reports/stats');
      if (statsRes.data) {
        await db.cached_stats.put({ key: 'dashboard_stats', ...statsRes.data });
      }
    } catch (e) {
      console.warn('Stats cache skipped:', e.message);
    }
    
    localStorage.setItem('raid_last_sync', newSyncTime);
  },

  // Get count of pending operations
  async getPendingCount() {
    try {
      return await db.sync_outbox.where('processed').equals(0).count();
    } catch {
      return 0;
    }
  }
};
