// Centralized Backend API Configuration
export const RAW_BASE_URL = 'https://flatbed-overcast-bolster.ngrok-free.dev';
export const API_BASE_URL = `${RAW_BASE_URL}/gobi360`;

export const DEFAULT_HEADERS = {
  'ngrok-skip-browser-warning': 'true'
};

/**
 * Returns full API URL for any path.
 * Handles both "gobi360/categories/" and "categories/" endpoints.
 * Base URL: https://flatbed-overcast-bolster.ngrok-free.dev/
 */

export function getApiUrl(path) {
  if (!path) return API_BASE_URL;
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (cleanPath.startsWith('gobi360/')) {
    return `${RAW_BASE_URL}/${cleanPath}`;
  }
  return `${API_BASE_URL}/${cleanPath}`;
}


