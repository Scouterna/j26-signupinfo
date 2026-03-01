/**
 * API Service Layer
 * 
 * Fetches scout group data from the backend API and wraps it
 * in the villages structure expected by the frontend.
 */

const API_BASE = import.meta.env.VITE_API_URL || './api';

/**
 * Generic API fetch helper with error handling
 * 
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} If the request fails
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint.replace(/^\.\//, '')}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the available projects.
 * 
 * @returns {Promise<Object>} Dict of project_id -> project_name
 * @throws {Error} If the request fails
 */
export async function fetchProjects() {
  return apiFetch('/stats/projects');
}

/**
 * Fetches question metadata for a project.
 * 
 * @param {number|string} projectId
 * @returns {Promise<Object>} Sections with nested questions
 * @throws {Error} If the request fails
 */
export async function fetchQuestions(projectId) {
  return apiFetch(`/stats/${projectId}/questions`);
}

/**
 * Fetches all groups for a project (id → name mapping).
 * 
 * @param {number|string} projectId
 * @returns {Promise<Object>} Dict of group_id -> group_name, sorted alphabetically by name
 * @throws {Error} If the request fails
 */
export async function fetchGroups(projectId) {
  return apiFetch(`/stats/${projectId}/groups`);
}

/**
 * Fetches pre-aggregated statistics summary for the given groups.
 *
 * @param {number|string} projectId
 * @param {number[]} groupIds - Array of group IDs to include
 * @returns {Promise<Object>} Summary with total_participants, num_groups, stats
 * @throws {Error} If the request fails
 */
export async function fetchGroupInfoSummary(projectId, groupIds) {
  const params = groupIds.map(id => `group_ids=${id}`).join('&');
  return apiFetch(`/stats/${projectId}/groupinfo/summary?${params}`);
}

/**
 * Fetches which groups gave which answers for a specific question.
 *
 * @param {number|string} projectId
 * @param {number|string} questionId
 * @param {number[]} groupIds - Array of group IDs to include
 * @returns {Promise<Object>} { questionId: { answerId: [group_ids] } }
 * @throws {Error} If the request fails
 */
export async function fetchQuestionGroupResponse(projectId, questionId, groupIds) {
  const params = groupIds.map(id => `group_ids=${id}`).join('&');
  return apiFetch(`/stats/${projectId}/groupinfo/response/${questionId}?${params}`);
}

/**
 * Fetches all scout groups from the backend, handling pagination.
 * Requests the first page, then fetches any remaining pages in parallel.
 * 
 * @param {number|string} projectId
 * @returns {Promise<Array>} Array of all scout group objects
 * @throws {Error} If any API request fails
 */
async function fetchAllGroups(projectId) {
  const firstPage = await apiFetch(`/stats/${projectId}/groupinfo?page=1&size=100`);
  let allItems = [...firstPage.items];

  if (firstPage.pages > 1) {
    const remaining = Array.from({ length: firstPage.pages - 1 }, (_, i) =>
      apiFetch(`/stats/${projectId}/groupinfo?page=${i + 2}&size=100`)
    );
    const pages = await Promise.all(remaining);
    pages.forEach(p => allItems.push(...p.items));
  }

  return allItems;
}

/**
 * Fetches all scout groups and wraps them in a single-village structure
 * matching the format expected by the frontend components.
 * 
 * @param {number|string} projectId
 * @returns {Promise<Object>} Villages data object with structure { villages: [...] }
 * @throws {Error} If the API request fails
 */
export async function fetchVillagesData(projectId) {
  const groups = await fetchAllGroups(projectId);
  return {
    villages: [{
      id: 'all',
      name: 'Alla kårer',
      num_participants: groups.reduce((sum, g) => sum + (g.num_participants || 0), 0),
      ScoutGroups: groups,
    }]
  };
}
