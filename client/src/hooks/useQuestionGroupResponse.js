import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuestionGroupResponse } from '../services/api';

/**
 * TanStack Query hook that lazily fetches which groups gave which answers
 * for a specific question. Starts disabled — call refetch() to trigger.
 *
 * @param {number|null} projectId
 * @param {number|string} questionId
 * @param {Set<number>} selectedGroupIds
 * @returns {{ data: Object|undefined, isLoading: boolean, refetch: function }}
 */
export default function useQuestionGroupResponse(projectId, questionId, selectedGroupIds) {
  const sortedIds = useMemo(
    () => Array.from(selectedGroupIds).sort((a, b) => a - b),
    [selectedGroupIds],
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['questionResponse', projectId, questionId, ...sortedIds],
    queryFn: () => fetchQuestionGroupResponse(projectId, questionId, sortedIds),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: isFetching, refetch };
}
