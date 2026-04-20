import { API_BASE } from '../../../lib/apiConfig';
import { getToken } from '../../../lib/storage';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

export const getPendingVerifications = async () => {
    const response = await fetch(`${API_BASE}/supervisor/submissions`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch pending verifications');
    const data = await response.json();
    return data;
};

export const verifyDailyProductionRow = async (log_id: number, row_index: number, status: string, reason?: string) => {
    const response = await fetch(`${API_BASE}/supervisor/verify-row`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ log_id, row_index, status, reason })
    });
    if (!response.ok) throw new Error('Failed to verify row');
    return response.json();
};

export const verifyDailyProductionLog = async (log_id: number, status: string, comment?: string) => {
    const response = await fetch(`${API_BASE}/supervisor/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ log_id, status, comment })
    });
    if (!response.ok) throw new Error('Failed to verify log');
    return response.json();
};
