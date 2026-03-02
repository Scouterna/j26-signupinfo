import { useState, useEffect, useCallback } from 'react';
import { fetchVillagesData } from '../services/api';

/**
 * @typedef {import('../services/api').VillagesData} VillagesData
 */

/**
 * Custom hook for fetching villages/group data from the API.
 * Waits for a valid projectId before fetching.
 *
 * @param {number|null} projectId - The project to fetch groups for
 * @returns {{ data: VillagesData|null, loading: boolean, error: Error|null, refetch: () => void }} Data fetching state and controls
 */
export default function useApiData(projectId) {
  const [data, setData] = useState(/** @type {VillagesData|null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {Error|null} */ (null));

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    
    try {
      const villagesData = await fetchVillagesData(projectId);
      setData(villagesData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Failed to fetch villages data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
