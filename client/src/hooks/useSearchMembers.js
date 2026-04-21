import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSearchMembers } from '../services/api';

/**
 * @typedef {{ member_no: number, name: string, born: string, registration_group: string, member_group: string, email?: string, mobile?: string }} SearchMember
 */

/**
 * Debounces a changing value so TanStack Query doesn't fire a request per
 * keystroke. 300ms feels responsive without spamming the backend.
 *
 * @template T
 * @param {T} value
 * @param {number} delay
 * @returns {T}
 */
function useDebounced(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return debounced;
}

/**
 * Hook that searches participants by name. Doesn't fire until the user has
 * typed at least 2 characters (the backend would otherwise reply 422 "too
 * many matches" for single-letter queries on any real project).
 *
 * Backend semantics translated to simpler client state:
 * - 404 no matches → `results: []`
 * - 422 too many matches → `tooMany: true`
 * - everything else → bubbles up as `error`
 *
 * @param {number|null} projectId
 * @param {string} query
 * @returns {{ results: SearchMember[] | null, loading: boolean, error: Error|null, tooMany: boolean, enabled: boolean }}
 */
export default function useSearchMembers(projectId, query) {
	const debouncedQuery = useDebounced(query, 300);
	const trimmed = debouncedQuery.trim();
	const enabled = !!projectId && trimmed.length >= 2;

	const { data, isFetching, error } = useQuery({
		queryKey: ['searchMembers', projectId, trimmed],
		queryFn: async () => {
			try {
				return await fetchSearchMembers(/** @type {number} */ (projectId), {
					name: trimmed,
					maxHits: 50,
				});
			} catch (e) {
				if (/** @type {any} */ (e)?.status === 404) return [];
				throw e;
			}
		},
		enabled,
		staleTime: 30_000,
	});

	const err = /** @type {(Error & { status?: number }) | null} */ (error);

	return {
		results: data ?? null,
		loading: isFetching,
		error: err?.status === 422 ? null : err,
		tooMany: err?.status === 422,
		enabled,
	};
}
