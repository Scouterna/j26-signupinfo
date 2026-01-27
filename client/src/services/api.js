/**
 * API Service Layer
 * 
 * Handles data fetching with environment-based switching between
 * test data and backend API.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const USE_TEST_DATA = import.meta.env.VITE_USE_TEST_DATA === 'true';

/**
 * Fetches villages data with scout groups and statistics.
 * Uses test data in development or when VITE_USE_TEST_DATA is true,
 * otherwise fetches from the backend API.
 * 
 * @returns {Promise<Object>} Villages data object
 * @throws {Error} If the API request fails
 */
export async function fetchVillagesData() {
  if (USE_TEST_DATA) {
    // Dynamic import of test data for development
    const { default: testData } = await import('../../testdata/testdata.json');
    // Simulate network delay in development for realistic testing
    await new Promise(resolve => setTimeout(resolve, 300));
    return testData;
  }

  const response = await fetch(`${API_BASE}/villages`);
  if (!response.ok) {
    throw new Error(`Failed to fetch villages data: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

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
 * Check if the app is configured to use test data
 * @returns {boolean}
 */
export function isUsingTestData() {
  return USE_TEST_DATA;
}
