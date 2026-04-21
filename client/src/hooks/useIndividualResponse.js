import { useQuery } from '@tanstack/react-query';
import { fetchIndividualResponse } from '../services/api';

/**
 * Fetches one participant's raw question responses. Disabled until both
 * projectId and memberId are known.
 *
 * @param {number|null} projectId
 * @param {number|null} memberId
 * @returns {{ responses: Record<string, any> | null, loading: boolean, error: Error|null }}
 */
export default function useIndividualResponse(projectId, memberId) {
	const { data, isFetching, error } = useQuery({
		queryKey: ['individualResponse', projectId, memberId],
		queryFn: () =>
			fetchIndividualResponse(
				/** @type {number} */ (projectId),
				/** @type {number} */ (memberId),
			),
		enabled: !!projectId && !!memberId,
		staleTime: Infinity,
	});

	return {
		responses: data ?? null,
		loading: isFetching,
		error: /** @type {Error|null} */ (error),
	};
}
