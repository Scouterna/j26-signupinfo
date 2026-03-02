import { useQuery } from '@tanstack/react-query';
import { fetchVillagesData } from '../services/api';

/**
 * @typedef {import('../services/api').VillagesData} VillagesData
 */

/**
 * TanStack Query hook for fetching the full villages/group data (with participant
 * counts and stats) from the paginated groupinfo endpoint.
 * Waits for a valid projectId before fetching.
 *
 * @param {number|null} projectId - The project to fetch groups for
 * @returns {{ data: VillagesData|null, loading: boolean, error: Error|null, refetch: () => void }}
 */
export default function useApiData(projectId) {
	const {
		data,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ['villagesData', projectId],
		queryFn: () => fetchVillagesData(/** @type {number} */ (projectId)),
		enabled: !!projectId,
		staleTime: Infinity,
	});

	return {
		data: data ?? null,
		loading: isFetching,
		error: /** @type {Error|null} */ (error),
		refetch,
	};
}
