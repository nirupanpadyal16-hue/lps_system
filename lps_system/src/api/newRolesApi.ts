import axios from 'axios';
import { getToken } from '../lib/storage';

const BASE_URL = 'http://localhost:5007/api';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` }
});

// ─── PPC PLANNER APIs ────────────────────────────────────────────────────────

export const ppcApi = {
  // Demands
  getDemands: () => axios.get(`${BASE_URL}/ppc/demands`, authHeaders()),
  createDemand: (data: any) => axios.post(`${BASE_URL}/ppc/demands`, data, authHeaders()),
  updateDemand: (id: number, data: any) => axios.put(`${BASE_URL}/ppc/demands/${id}`, data, authHeaders()),
  sendToDispatch: (id: number) => axios.post(`${BASE_URL}/ppc/demands/${id}/send-to-dispatch`, {}, authHeaders()),

  // Inventory
  getInventory: (demandId?: number) =>
    axios.get(`${BASE_URL}/ppc/inventory${demandId ? `?demand_id=${demandId}` : ''}`, authHeaders()),
  uploadStock: (file: File, demandId?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (demandId) form.append('demand_id', String(demandId));
    return axios.post(`${BASE_URL}/ppc/inventory/upload-stock`, form, {
      ...authHeaders(),
      headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' }
    });
  },

  // Machine Registry / RM
  getMachineRegistry: (demandId?: number) =>
    axios.get(`${BASE_URL}/ppc/machine-registry${demandId ? `?demand_id=${demandId}` : ''}`, authHeaders()),
  getRMData: (itemId: number) => axios.get(`${BASE_URL}/ppc/machine-registry/${itemId}/rm-data`, authHeaders()),
  submitRM: (itemId: number, data: any) =>
    axios.post(`${BASE_URL}/ppc/machine-registry/${itemId}/submit-rm`, data, authHeaders()),
  getRMRequests: () => axios.get(`${BASE_URL}/ppc/rm-requests`, authHeaders()),

  // Notifications
  getNotifications: () => axios.get(`${BASE_URL}/ppc/notifications`, authHeaders()),
  markNotificationRead: (id: number) => axios.post(`${BASE_URL}/ppc/notifications/${id}/read`, {}, authHeaders()),
};

// ─── STORE KEEPER APIs ───────────────────────────────────────────────────────

export const skApi = {
  // RM Queue
  getRMQueue: (status?: string) =>
    axios.get(`${BASE_URL}/storekeeper/rm-requests${status ? `?status=${status}` : ''}`, authHeaders()),
  getRMRequest: (id: number) => axios.get(`${BASE_URL}/storekeeper/rm-requests/${id}`, authHeaders()),
  acceptRM: (id: number, data?: any) =>
    axios.post(`${BASE_URL}/storekeeper/rm-requests/${id}/accept`, data || {}, authHeaders()),
  rejectRM: (id: number, data: any) =>
    axios.post(`${BASE_URL}/storekeeper/rm-requests/${id}/reject`, data, authHeaders()),

  // Dispatch
  getDispatchQueue: () => axios.get(`${BASE_URL}/storekeeper/dispatch-queue`, authHeaders()),
  getDispatches: () => axios.get(`${BASE_URL}/storekeeper/dispatches`, authHeaders()),
  createDispatch: (data: any) => axios.post(`${BASE_URL}/storekeeper/dispatches`, data, authHeaders()),

  // Notifications
  getNotifications: () => axios.get(`${BASE_URL}/storekeeper/notifications`, authHeaders()),
  markNotificationRead: (id: number) =>
    axios.post(`${BASE_URL}/storekeeper/notifications/${id}/read`, {}, authHeaders()),
  markAllRead: () => axios.post(`${BASE_URL}/storekeeper/notifications/mark-all-read`, {}, authHeaders()),
};

// ─── DEO Machine Entry APIs ──────────────────────────────────────────────────

export const deoMachineApi = {
  getShiftInfo: () => axios.get(`${BASE_URL}/deo/machine-entries/shift-info`, authHeaders()),
  getEntries: (params?: { date?: string; demand_id?: number }) =>
    axios.get(`${BASE_URL}/deo/machine-entries`, { ...authHeaders(), params }),
  createEntry: (data: any) => axios.post(`${BASE_URL}/deo/machine-entries`, data, authHeaders()),
  updateMachineEntry: (id: number, data: any) => axios.put(`${BASE_URL}/deo/machine-entries/${id}`, data, authHeaders()),
  getShortageRequests: () => axios.get(`${BASE_URL}/deo/shortage-requests`, authHeaders()),
  getShortagePartsByMachine: () => axios.get(`${BASE_URL}/deo/shortage-parts-by-machine`, authHeaders()),
  getMachines: () => axios.get(`${BASE_URL}/deo/machines`, authHeaders()),
  getInventory: () => axios.get(`${BASE_URL}/deo/inventory`, authHeaders()),
  getNotifications: () => axios.get(`${BASE_URL}/deo/notifications`, authHeaders()),
  markNotificationRead: (id: number) =>
    axios.post(`${BASE_URL}/deo/notifications/${id}/read`, {}, authHeaders()),
};

// ─── Supervisor Machine Monitoring APIs ──────────────────────────────────────

export const supervisorMachineApi = {
  getMachineEntries: (params?: { date?: string; demand_id?: number; shift?: string }) =>
    axios.get(`${BASE_URL}/supervisor/machine-entries`, { ...authHeaders(), params }),
  verifyEntry: (id: number, data: any) =>
    axios.post(`${BASE_URL}/supervisor/machine-entries/${id}/verify`, data, authHeaders()),
  getNotifications: () => axios.get(`${BASE_URL}/supervisor/notifications`, authHeaders()),
  markNotificationRead: (id: number) =>
    axios.post(`${BASE_URL}/supervisor/notifications/${id}/read`, {}, authHeaders()),
  markAllRead: () => axios.post(`${BASE_URL}/supervisor/notifications/mark-all-read`, {}, authHeaders()),
};
