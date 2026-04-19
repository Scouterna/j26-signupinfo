import { useQuery } from '@tanstack/react-query';
import { fetchScoutGroups } from '../services/api';

/**
 * @typedef {import('../services/api').ScoutGroup} ScoutGroup
 */

/**
 * TanStack Query hook for fetching the full scout group data (with participant
 * counts and stats) from the paginated groupinfo endpoint.
 * Waits for a valid projectId before fetching.
 *
 * @param {number|null} projectId - The project to fetch groups for
 * @returns {{ scoutGroups: ScoutGroup[] | null, loading: boolean, error: Error|null, refetch: () => void }}
 */
export default function useApiData(projectId) {
	const {
		data,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ['scoutGroups', projectId],
		queryFn: () => fetchScoutGroups(/** @type {number} */ (projectId)),
		enabled: !!projectId,
		staleTime: Infinity,
	});

	return {
		scoutGroups: data ?? null,
		loading: isFetching,
		error: /** @type {Error|null} */ (error),
		refetch,
	};
}