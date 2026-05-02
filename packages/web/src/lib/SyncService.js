import { db } from './db';
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
          const { id, sync_status, ...cleanPayload } = payload;
          const response = await api.post(`/${table_name}`, cleanPayload);
          
          await db[table_name].update(record_id, { 
            server_id: response.data.id, 
            sync_status: 'synced' 
          });
        } 
        else if (action === 'UPDATE') {
          const idToUse = payload.server_id || record_id;
          const { id, server_id, sync_status, ...cleanPayload } = payload;
          await api.put(`/${table_name}/${idToUse}`, cleanPayload);
          await db[table_name].update(record_id, { sync_status: 'synced' });
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
    const tables = ['clients', 'products', 'invoices', 'expenses'];
    const lastSync = localStorage.getItem('raid_last_sync') || '1970-01-01T00:00:00Z';
    const newSyncTime = new Date().toISOString();

    for (const table of tables) {
      try {
        const response = await api.get(`/${table}`, {
          params: { updated_at: lastSync }
        });

        const data = response.data;

        if (data && data.length > 0) {
          for (const remoteRecord of data) {
            const localRecord = await db[table]
              .where('server_id')
              .equals(remoteRecord.id)
              .first();

            if (localRecord && localRecord.sync_status === 'pending_push') {
              console.warn(`Conflict detected for ${table} ${remoteRecord.id}. Server version took priority.`);
            }

            await db[table].put({
              ...remoteRecord,
              server_id: remoteRecord.id,
              sync_status: 'synced'
            });
          }
        }
      } catch (error) {
        console.error(`Error pulling ${table}:`, error);
      }
    }
    
    localStorage.setItem('raid_last_sync', newSyncTime);
  }
};

