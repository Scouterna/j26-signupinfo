/**
 * API Service Layer
 * 
 * Fetches scout group data from the backend API and wraps it
 * in the villages structure expected by the frontend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic API fetch helper with error handling
 * 
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} If the request fails
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches all scout groups from the backend, handling pagination.
 * Requests the first page, then fetches any remaining pages in parallel.
 * 
 * @returns {Promise<Array>} Array of all scout group objects
 * @throws {Error} If any API request fails
 */
async function fetchAllGroups() {
  const firstPage = await apiFetch('/stats/groups/all?page=1&size=100');
  let allItems = [...firstPage.items];

  if (firstPage.pages > 1) {
    const remaining = Array.from({ length: firstPage.pages - 1 }, (_, i) =>
      apiFetch(`/stats/groups/all?page=${i + 2}&size=100`)
    );
    const pages = await Promise.all(remaining);
    pages.forEach(p => allItems.push(...p.items));
  }

  return allItems;
}

/**
 * Fetches all scout groups and wraps them in a single-village structure
 * matching the format expected by the frontend components.
 * 
 * @returns {Promise<Object>} Villages data object with structure { villages: [...] }
 * @throws {Error} If the API request fails
 */
export async function fetchVillagesData() {
  const groups = await fetchAllGroups();
  return {
    villages: [{
      id: 'all',
      name: 'Alla kårer',
      num_participants: groups.reduce((sum, g) => sum + (g.num_participants || 0), 0),
      ScoutGroups: groups,
    }]
  };
}
