/**
 * API Service Layer
 * 
 * Handles data fetching with environment-based switching between
 * test data and backend API.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const USE_TEST_DATA = import.meta.env.VITE_USE_TEST_DATA === 'true';

/**
 * Builds the villages data structure from scout groups and village config.
 * 
 * @param {Object} scoutGroupData - Object with ScoutGroups array
 * @param {Object} villageConfig - Object mapping village names to scout group IDs
 * @returns {Object} Villages data object with structure { villages: [...] }
 */
function buildVillagesFromData(scoutGroupData, villageConfig) {
  // Create a map of scout group ID to scout group data for quick lookup
  const scoutGroupMap = new Map();
  scoutGroupData.ScoutGroups.forEach(sg => {
    scoutGroupMap.set(sg.id, sg);
  });

  // Build villages array from the config
  const villages = Object.entries(villageConfig).map(([villageName, scoutGroupIds]) => {
    // Get scout groups for this village, filtering out any IDs not found in data
    const scoutGroups = scoutGroupIds
      .map(id => scoutGroupMap.get(id))
      .filter(sg => sg !== undefined);

    // Calculate total participants for this village
    const numParticipants = scoutGroups.reduce((sum, sg) => sum + (sg.num_participants || 0), 0);

    return {
      id: villageName, // Use village name as ID since config doesn't provide separate IDs
      name: villageName,
      num_participants: numParticipants,
      ScoutGroups: scoutGroups,
    };
  });

  return { villages };
}

/**
 * Fetches scout groups data.
 * Uses test data in development or when VITE_USE_TEST_DATA is true.
 * 
 * @returns {Promise<Object>} Scout groups data object
 */
async function fetchScoutGroupsData() {
  if (USE_TEST_DATA) {
    const { default: data } = await import('../../testdata/testdata-deltagare.json');
    return data;
  }
  const response = await fetch(`${API_BASE}/scoutgroups`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scout groups data: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches village configuration (mapping of village names to scout group IDs).
 * Uses test data in development or when VITE_USE_TEST_DATA is true.
 * 
 * @returns {Promise<Object>} Village config object
 */
async function fetchVillageConfig() {
  if (USE_TEST_DATA) {
    const { default: config } = await import('../../testdata/testdata-names.json');
    return config;
  }
  const response = await fetch(`${API_BASE}/villages/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch village config: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches villages data with scout groups and statistics.
 * Combines data from two sources: scout groups data and village configuration.
 * Uses test data in development or when VITE_USE_TEST_DATA is true,
 * otherwise fetches from the backend API.
 * 
 * @returns {Promise<Object>} Villages data object
 * @throws {Error} If the API request fails
 */
export async function fetchVillagesData() {
  // Fetch both data sources in parallel
  const [scoutGroupData, villageConfig] = await Promise.all([
    fetchScoutGroupsData(),
    fetchVillageConfig(),
  ]);

  // Simulate network delay in development for realistic testing
  if (USE_TEST_DATA) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return buildVillagesFromData(scoutGroupData, villageConfig);
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
