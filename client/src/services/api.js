/**
 * API Service Layer
 *
 * Fetches scout group data from the backend API.
 */

/**
 * @typedef {{ text: string, type?: string, choices?: Record<string, string> }} Question
 * @typedef {{ text: string, questions: Record<string, Question> }} QuestionSection
 * @typedef {{ total_participants: number, num_groups: number, stats: Record<string, Record<string, number> | number> }} GroupInfoSummary
 * @typedef {{ id: number, name: string, num_participants?: number }} ScoutGroup
 */

const API_BASE = import.meta.env.VITE_API_URL || './api';

/**
 * Generic API fetch helper with error handling
 *
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {RequestInit} options - Fetch options
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
    const err = /** @type {Error & { status: number }} */ (new Error(`API request failed: ${response.status} ${response.statusText}`));
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Fetches the available projects.
 *
 * @returns {Promise<Record<string, string>>} Dict of project_id -> project_name
 * @throws {Error} If the request fails
 */
export async function fetchProjects() {
  return apiFetch('/stats/projects');
}

/**
 * Fetches question metadata for a project.
 *
 * @param {number|string} projectId
 * @returns {Promise<Record<string, QuestionSection>>} Sections with nested questions
 * @throws {Error} If the request fails
 */
export async function fetchQuestions(projectId) {
  return apiFetch(`/stats/${projectId}/questions`);
}

/**
 * Fetches all groups for a project (id → name mapping).
 *
 * @param {number|string} projectId
 * @returns {Promise<Record<string, string>>} Dict of group_id -> group_name, sorted alphabetically by name
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
 * @returns {Promise<GroupInfoSummary>} Summary with total_participants, num_groups, stats
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
 * @returns {Promise<Record<string, Record<string, number[]>>>} { questionId: { answerId: [group_ids] } }
 * @throws {Error} If the request fails
 */
export async function fetchQuestionGroupResponse(projectId, questionId, groupIds) {
  const params = groupIds.map(id => `group_ids=${id}`).join('&');
  return apiFetch(`/stats/${projectId}/groupinfo/response/${questionId}?${params}`);
}

/**
 * Fetches all individuals (with their responses) for a single group.
 *
 * @param {number|string} projectId
 * @param {number|string} groupId
 * @returns {Promise<Array<{ member_no: number, name: string, born: string, group_id: number, group_name: string, responses: Record<string, any>, email?: string, mobile?: string }>>}
 * @throws {Error} If the request fails
 */
export async function fetchIndividualsByGroup(projectId, groupId) {
  return apiFetch(`/stats/${projectId}/individualinfo/group/${groupId}`);
}

/**
 * Fetches a single participant's responses. Returns just the raw responses
 * dict ({ questionId: value, ... }) — not wrapped with member_no/name.
 *
 * @param {number|string} projectId
 * @param {number|string} memberId
 * @returns {Promise<Record<string, any>>}
 * @throws {Error} If the request fails
 */
export async function fetchIndividualResponse(projectId, memberId) {
  return apiFetch(`/stats/${projectId}/individualinfo/${memberId}`);
}

/**
 * Searches for participants matching the given criteria. The endpoint returns
 * 404 when nothing matches and 422 when the hit count exceeds `maxHits` — the
 * caller is responsible for handling those cases (e.g. via `err.status`).
 *
 * @param {number|string} projectId
 * @param {{ name?: string, born?: string, group?: string, maxHits?: number }} params
 * @returns {Promise<Array<{ member_no: number, name: string, born: string, registration_group: string, member_group: string, email?: string, mobile?: string }>>}
 * @throws {Error & { status: number }} If the request fails
 */
export async function fetchSearchMembers(projectId, { name = "", born = "", group = "", maxHits = 50 } = {}) {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (born) params.set("born", born);
  if (group) params.set("group", group);
  params.set("max_hits", String(maxHits));
  return apiFetch(`/stats/${projectId}/search_member?${params.toString()}`);
}

/**
 * Fetches all scout groups from the backend, handling pagination.
 * Requests the first page, then fetches any remaining pages in parallel.
 *
 * @param {number|string} projectId
 * @returns {Promise<ScoutGroup[]>} Array of all scout group objects
 * @throws {Error} If any API request fails
 */
export async function fetchScoutGroups(projectId) {
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