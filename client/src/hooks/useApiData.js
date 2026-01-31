import { useState, useEffect, useCallback } from 'react';
import { fetchVillagesData } from '../services/api';

/**
 * Custom hook for fetching villages data from API or test data.
 * Handles loading, error states, and provides a refetch function.
 * 
 * @returns {Object} Data fetching state and controls
 * @returns {Object|null} data - The fetched villages data
 * @returns {boolean} loading - Whether data is currently being fetched
 * @returns {Error|null} error - Any error that occurred during fetch
 * @returns {Function} refetch - Function to manually trigger a refetch
 */
export default function useApiData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const villagesData = await fetchVillagesData();
      setData(villagesData);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch villages data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
