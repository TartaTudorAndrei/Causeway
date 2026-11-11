import type { StockLocation, StockItem, LocationStock, StockTransferRecord, TransferItemRequest } from '../types/logistics';
import { auditService } from './auditService';
import { fetchWithCsrf } from './apiClient';

const API_BASE_URL = '/api/admin/logistics';

function getAuthHeader(): Record<string, string> {
  return {};
}

function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetchWithCsrf(input, init);
}

export const logisticsService = {
  async getLocations(): Promise<StockLocation[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/locations`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:locations',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addLocation(location: Omit<StockLocation, 'id'>): Promise<StockLocation> {
    const res = await authFetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      let errMsg = 'Eroare la salvarea locației';
      try {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            errMsg = json.message || json.error || text;
          } catch {
            errMsg = text;
          }
        }
      } catch {
        // fallback
      }
      throw new Error(errMsg);
    }
    const created: StockLocation = await res.json();
    
    // Record cross-website audit log (non-blocking)
    try {
      await auditService.recordAuditLog({
        department: 'LOGISTICS',
        actionType: 'CREATE',
        resourceType: 'Stock Location',
        resourceId: created.id,
        resourceName: created.name,
        summary: `Locație logistică nouă creată: ${created.name} (${created.type})`,
        details: created.description,
        stateChanges: created,
      });
    } catch {
      // audit log failure should not fail location creation
    }

    return created;
  },

  async updateLocation(locationId: string, location: Partial<StockLocation>): Promise<StockLocation> {
    const res = await authFetch(`${API_BASE_URL}/locations/${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      let errMsg = 'Eroare la actualizarea locației';
      try {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            errMsg = json.message || json.error || text;
          } catch {
            errMsg = text;
          }
        }
      } catch {}
      throw new Error(errMsg);
    }
    const updated: StockLocation = await res.json();
    return updated;
  },

  async deleteLocation(locationId: string): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/locations/${locationId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      let errMsg = 'Eroare la ștergerea locației';
      try {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            errMsg = json.message || json.error || text;
          } catch {
            errMsg = text;
          }
        }
      } catch {}
      throw new Error(errMsg);
    }
  },

  async getItems(): Promise<StockItem[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/items`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:items',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addItem(item: Omit<StockItem, 'id'>): Promise<StockItem> {
    const res = await authFetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la salvarea articolului');
    }
    const created: StockItem = await res.json();

    // Record cross-website audit log
    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'CREATE',
      resourceType: 'Stock Item',
      resourceId: created.id,
      resourceName: created.name,
      summary: `Articol nou creat: ${created.name} (${created.category || 'General'})`,
      details: `Unitate: ${created.unit}`,
      stateChanges: created,
    });

    return created;
  },

  async updateItem(itemId: string, item: Partial<StockItem>): Promise<StockItem> {
    const res = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la actualizarea articolului');
    }
    const updated: StockItem = await res.json();
    return updated;
  },

  async deleteItem(itemId: string, itemName?: string): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la ștergerea articolului');
    }

    // Record cross-website audit log
    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'DELETE',
      resourceType: 'Stock Item',
      resourceId: itemId,
      resourceName: itemName || `Item #${itemId.substring(0, 8)}`,
      summary: `Articol de stoc șters: ${itemName || itemId}`,
      details: `ID Articol: ${itemId}`,
    });
  },

  async getStocks(): Promise<LocationStock[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/stocks`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:stocks',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  getItemStockAtLocation(stocks: LocationStock[], itemId: string, locationId: string): number {
    const entry = stocks.find(s => s.itemId === itemId && s.locationId === locationId);
    return entry ? entry.quantity : 0;
  },

  async getTransfers(): Promise<StockTransferRecord[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/transfers`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:transfers',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async executeTransfer(
    sourceLocationId: string,
    destinationLocationId: string,
    transferItems: TransferItemRequest[],
    performedBy: string,
    notes?: string
  ): Promise<unknown> {
    const res = await authFetch(`${API_BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        sourceLocationId,
        destinationLocationId,
        items: transferItems,
        performedBy,
        notes,
      }),
      domain: 'logistics',
      isOfflineCapable: true,
    } as any);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la efectuarea transferului');
    }

    const result = await res.json();

    // Record cross-website audit log
    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'TRANSFER',
      resourceType: 'Stock Transfer',
      resourceName: `Transfer ${transferItems.length} articole`,
      summary: `Transfer de stoc efectuat (${transferItems.length} tipuri de articole)`,
      details: `De la locația ${sourceLocationId} la ${destinationLocationId}. Efectuat de: ${performedBy}.${notes ? ` Note: ${notes}` : ''}`,
      stateChanges: { sourceLocationId, destinationLocationId, items: transferItems, notes },
    });

    return result;
  },

  async getAdjustments(): Promise<import('../types/logistics').StockAdjustmentRecord[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/adjustments`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:adjustments',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async adjustStock(request: import('../types/logistics').StockAdjustmentRequest, meta?: { itemName?: string; locationName?: string }): Promise<import('../types/logistics').StockAdjustmentRecord> {
    const res = await authFetch(`${API_BASE_URL}/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
      domain: 'logistics',
      isOfflineCapable: true,
    } as any);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la ajustarea stocului');
    }

    const record: import('../types/logistics').StockAdjustmentRecord = await res.json();

    // Record cross-website audit log
    const itemLabel = meta?.itemName || `Articol ${request.itemId.substring(0, 8)}`;
    const locLabel = meta?.locationName || `Locație ${request.locationId.substring(0, 8)}`;
    
    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'ADJUSTMENT',
      resourceType: 'Stock Adjustment',
      resourceId: request.itemId,
      resourceName: `${itemLabel} @ ${locLabel}`,
      summary: `Ajustare manuală stoc: ${itemLabel} la ${locLabel} -> Noua cantitate: ${request.newQuantity}`,
      details: `Motiv: ${request.reason || 'MANUAL_ADJUSTMENT'}. ${request.notes ? `Note: ${request.notes}` : ''}`,
      stateChanges: {
        itemId: request.itemId,
        locationId: request.locationId,
        previousQuantity: record.previousQuantity,
        newQuantity: request.newQuantity,
        reason: request.reason,
        notes: request.notes,
      },
    });

    return record;
  },

  async getEoDReports(): Promise<import('../types/logistics').LogisticsEoDReport[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/eod`, {
        headers: { ...getAuthHeader() },
        cacheKey: 'logistics:eod',
      } as any);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async submitEoDReport(request: import('../types/logistics').LogisticsEoDSubmitRequest, locationName?: string): Promise<import('../types/logistics').LogisticsEoDReport> {
    const res = await authFetch(`${API_BASE_URL}/eod`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
      domain: 'logistics',
      isOfflineCapable: true,
    } as any);

    if (!res.ok) {
      let err = 'Eroare la salvarea raportului EoD';
      try {
        const errJson = await res.json();
        if (errJson?.message) err = errJson.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) err = text;
      }
      throw new Error(err);
    }

    const report: import('../types/logistics').LogisticsEoDReport = await res.json();

    // Record cross-website audit log
    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'SUBMIT',
      resourceType: 'Logistics EoD Report',
      resourceId: report.id,
      resourceName: locationName || request.standName || `Stand EoD`,
      summary: `Raport Logistic End of Day depus pentru ${locationName || request.standName || 'stand'}: ${request.mugCounts?.length || 0} linii inventar`,
      details: `Responsabil: ${request.closingPersonName}.${request.notes ? ` Observații: ${request.notes}` : ''}`,
      stateChanges: request,
    });

    return report;
  },

  async updateEoDReport(id: string, request: import('../types/logistics').LogisticsEoDSubmitRequest, locationName?: string): Promise<import('../types/logistics').LogisticsEoDReport> {
    const res = await authFetch(`${API_BASE_URL}/eod/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      let err = 'Eroare la actualizarea raportului EoD';
      try {
        const errJson = await res.json();
        if (errJson?.message) err = errJson.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) err = text;
      }
      throw new Error(err);
    }

    const report: import('../types/logistics').LogisticsEoDReport = await res.json();

    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'UPDATE',
      resourceType: 'Logistics EoD Report',
      resourceId: report.id,
      resourceName: locationName || request.standName || `Stand EoD`,
      summary: `Raport Logistic End of Day actualizat pentru ${locationName || request.standName || 'stand'}`,
      details: `Responsabil: ${request.closingPersonName}.${request.notes ? ` Observații: ${request.notes}` : ''}`,
      stateChanges: request,
    });

    return report;
  },

  async deleteEoDReport(id: string, standName?: string): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/eod/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la ștergerea raportului EoD');
    }

    await auditService.recordAuditLog({
      department: 'LOGISTICS',
      actionType: 'DELETE',
      resourceType: 'Logistics EoD Report',
      resourceId: id,
      resourceName: standName || 'Stand EoD',
      summary: `Raport Logistic End of Day șters pentru ${standName || 'stand'}`,
    });
  },

  async getStandStatistics(): Promise<import('../types/logistics').StandStatisticsRecord[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/stand-stats`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getPredictions(): Promise<import('../types/logistics').StockPredictionResponse> {
    try {
      const res = await authFetch(`${API_BASE_URL}/predictions`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        return {
          predictions: [],
          criticalItemsCount: 0,
          warningItemsCount: 0,
          healthyItemsCount: 0,
          upcomingSpecialEvents: [],
        };
      }
      return await res.json();
    } catch {
      return {
        predictions: [],
        criticalItemsCount: 0,
        warningItemsCount: 0,
        healthyItemsCount: 0,
        upcomingSpecialEvents: [],
      };
    }
  },

  async updateItemThresholds(
    itemId: string,
    req: import('../types/logistics').UpdateItemThresholdsRequest
  ): Promise<StockItem> {
    const res = await authFetch(`${API_BASE_URL}/items/${itemId}/thresholds`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Eroare la actualizarea parametrilor articolului');
    }
    return await res.json();
  },

    async getStandDispatchPrep(standId?: string, date?: string): Promise<import('../types/logistics').StandDispatchPrepResponse> {
    try {
      const params = new URLSearchParams();
      if (standId) params.append('standId', standId);
      if (date) params.append('date', date);
      const queryString = params.toString() ? ('?' + params.toString()) : '';
      const res = await authFetch(API_BASE_URL + '/stand-prep' + queryString, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        return {
          activeShiftsCount: 1,
          shifts: [],
          items: [],
          allCampaignStands: [],
        };
      }
      return await res.json();
    } catch {
      return {
        activeShiftsCount: 1,
        shifts: [],
        items: [],
        allCampaignStands: [],
      };
    }
  },

  async calculateRefillOptions(destinationLocationId: string, itemId: string, neededQuantity: number): Promise<import('../types/logistics').RefillOptimizerResponse | null> {
    try {
      const params = new URLSearchParams();
      params.append('destinationLocationId', destinationLocationId);
      params.append('itemId', itemId);
      params.append('neededQuantity', String(neededQuantity));
      const res = await authFetch(API_BASE_URL + '/refill-optimizer?' + params.toString(), {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
