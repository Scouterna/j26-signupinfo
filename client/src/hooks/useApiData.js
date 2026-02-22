import { useState, useEffect, useCallback } from 'react';
import { fetchVillagesData } from '../services/api';

/**
 * Custom hook for fetching villages/group data from the API.
 * Waits for a valid projectId before fetching.
 * 
 * @param {number|null} projectId - The project to fetch groups for
 * @returns {Object} Data fetching state and controls
 */
export default function useApiData(projectId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    
    try {
      const villagesData = await fetchVillagesData(projectId);
      setData(villagesData);
    } catch (err) {
      setError(err);
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
