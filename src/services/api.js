/**
 * Centralized API Service for gobi360 CRM
 */

export const BASE_URL = 'https://api.codingboss.in/gobi360';

/**
 * Reusable fetch wrapper with BASE_URL and required ngrok / JSON headers.
 */
export async function apiFetch(endpoint, options = {}) {
  // Normalize endpoint to combine with BASE_URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${cleanEndpoint}`;

  const defaultHeaders = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
  };

  const config = {
    method: 'GET',
    cache: 'no-store',
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  return await fetch(url, config);
}

/**
 * Call Requests API
 */
export async function fetchCallRequests() {
  const response = await apiFetch('/call-request-list/');
  if (response.status === 400 || response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }
  const data = await response.json();

  let callList = [];
  if (Array.isArray(data)) {
    callList = data;
  } else if (data && Array.isArray(data.results)) {
    callList = data.results;
  } else if (data && Array.isArray(data.data)) {
    callList = data.data;
  } else if (data && typeof data === 'object') {
    const arrayProp = Object.values(data).find(val => Array.isArray(val));
    callList = arrayProp || [];
  }

  return callList;
}

/**
 * Update Call Request Status & Notes API
 */
export async function updateCallRequest(id, payload) {
  const response = await apiFetch(`/call-request-crm-update/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`PUT request failed with status ${response.status}`);
  }

  return response.json().catch(() => ({ success: true }));
}

/**
 * Role Members API
 */
export async function fetchRoleMembers(role) {
  const res = await apiFetch(`/users/role/${role}/`);
  if (res.status === 400 || res.status === 404) return { success: true, count: 0, data: [] };
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

/**
 * User Contacts API
 */
export async function fetchUserContacts(mobile) {
  const res = await apiFetch(`/contacts/${mobile}/`);
  if (res.status === 400 || res.status === 404) return { success: true, count: 0, contacts: [], data: [] };
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

/**
 * Shops API
 */
export async function fetchShops() {
  const res = await apiFetch('/shops/', { method: 'GET' });
  if (res.status === 400 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.value)) return json.value;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  return [];
}

/**
 * Order Callback Data API
 * Requests /order-callback-data/{shopId}/?shop_id={shopId}
 */
export async function fetchOrderCallbackData(shopId, orderId) {
  const sId = typeof shopId === 'object' ? shopId?.id : shopId;
  const targetId = orderId || sId || 1;

  const res = await apiFetch(`/order-callback-data/${targetId}/`);

  if (res.status === 400 || res.status === 404) {
    const json = await res.json().catch(() => null);
    return json || { success: false, message: 'Order not found', data: [] };
  }

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
}
