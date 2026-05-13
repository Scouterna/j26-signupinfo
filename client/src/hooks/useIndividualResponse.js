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
	const enabled = !!projectId && !!memberId;
	const { data, isPending, isFetching, error } = useQuery({
		queryKey: ['individualResponse', projectId, memberId],
		queryFn: () =>
			fetchIndividualResponse(
				/** @type {number} */ (projectId),
				/** @type {number} */ (memberId),
			),
		enabled,
		staleTime: Infinity,
		// 4xx means the request itself is wrong (auth, missing, bad input) — retrying
		// just delays the error panel. Keep the default retry for 5xx / network blips.
		retry: (failureCount, /** @type {any} */ err) => {
			const status = err?.status;
			if (typeof status === 'number' && status >= 400 && status < 500) return false;
			return failureCount < 3;
		},
	});

	// Mirrors useIndividualsByGroup: using isPending (not just isFetching) keeps
	// loading=true across the gap between retries so the spinner doesn't flicker
	// into an empty table during backoff.
	return {
		responses: data ?? null,
		loading: enabled && (isPending || isFetching),
		error: /** @type {Error|null} */ (error),
	};
}
