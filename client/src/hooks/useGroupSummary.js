import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupInfoSummary } from '../services/api';

/**
 * TanStack Query hook that fetches the pre-aggregated groupinfo summary
 * for the currently selected scout groups.
 *
 * @param {number|null} projectId
 * @param {Set<number>} selectedGroupIds
 * @returns {{ totalParticipants: number, getStatisticData: (sectionId: string) => Record<string, Record<string, number> | number>, isLoading: boolean, error: Error|null }}
 */
export default function useGroupSummary(projectId, selectedGroupIds) {
  const sortedIds = useMemo(
    () => Array.from(selectedGroupIds).sort((a, b) => a - b),
    [selectedGroupIds],
  );

  const {
    data: summaryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['groupSummary', projectId, ...sortedIds],
    queryFn: () => fetchGroupInfoSummary(/** @type {number} */ (projectId), sortedIds),
    enabled: !!projectId && sortedIds.length > 0,
  });

  const totalParticipants = summaryData?.total_participants ?? 0;

  /**
   * Returns the raw summary data for a section.
   * @param {string} sectionId
   * @returns {Record<string, Record<string, number> | number>}
   */
  const getStatisticData = useCallback(
    (/** @type {string} */ sectionId) => /** @type {Record<string, Record<string, number> | number>} */ (summaryData?.stats?.[sectionId] ?? {}),
    [summaryData],
  );

  return { totalParticipants, getStatisticData, isLoading, error };
}
