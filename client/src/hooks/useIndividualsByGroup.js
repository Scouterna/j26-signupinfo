import { useQuery } from '@tanstack/react-query';
import { fetchIndividualsByGroup } from '../services/api';

/**
 * @typedef {{ member_no: number, name: string, born: string, group_id: number, group_name: string, responses: Record<string, any>, email?: string, mobile?: string }} Individual
 */

/**
 * Fetches all individuals for a given group within a project.
 *
 * @param {number|null} projectId
 * @param {number|null} groupId
 * @returns {{ individuals: Individual[] | null, loading: boolean, error: Error|null }}
 */
export default function useIndividualsByGroup(projectId, groupId) {
	const enabled = !!projectId && !!groupId;
	const {
		data,
		isPending,
		isFetching,
		error,
	} = useQuery({
		queryKey: ['individualsByGroup', projectId, groupId],
		queryFn: () => fetchIndividualsByGroup(
			/** @type {number} */ (projectId),
			/** @type {number} */ (groupId),
		),
		enabled,
		staleTime: Infinity,
	});

	// `isFetching` alone misses the render cycle between "query enabled" and the
	// observer actually scheduling the fetch — which on a fresh mount produced a
	// brief flash of the "no individuals" empty state before data arrived. Using
	// `isPending` while the query is enabled keeps loading=true until data is in.
	return {
		individuals: data ?? null,
		loading: enabled && (isPending || isFetching),
		error: /** @type {Error|null} */ (error),
	};
}