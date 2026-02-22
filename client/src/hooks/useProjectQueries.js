import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchQuestions, fetchGroups } from '../services/api';

const MANUAL_STATISTICS = ['Kön', 'Avgift'];

/**
 * Transforms the raw questions response into chip selector data.
 *
 * @param {Record<string, { text: string, questions: Record<string, { text: string }> }> | undefined} questionsData
 * @returns {{ statistics: string[], statisticSubQuestions: Record<string, string[]> }}
 */
function buildChipData(questionsData) {
  /** @type {string[]} */
  const statistics = [...MANUAL_STATISTICS];
  /** @type {Record<string, string[]>} */
  const statisticSubQuestions = {};

  if (!questionsData) return { statistics, statisticSubQuestions };

  const sections = Object.values(questionsData);
  const sectionNames = sections.map(s => s.text).sort((a, b) => a.localeCompare(b, 'sv'));
  statistics.push(...sectionNames);

  for (const section of sections) {
    const questionTexts = Object.values(section.questions || {})
      .map(q => q.text)
      .sort((a, b) => a.localeCompare(b, 'sv'));

    if (questionTexts.length > 1) {
      statisticSubQuestions[section.text] = questionTexts;
    }
  }

  return { statistics, statisticSubQuestions };
}

/**
 * Transforms the groups endpoint response ({name: id} dict) into the
 * villages structure expected by the selector components.
 *
 * @param {Record<string, number> | undefined} groupsData
 * @returns {{ villages: Array<{ id: string, name: string, ScoutGroups: Array<{ id: number, name: string }> }> }}
 */
function buildVillagesData(groupsData) {
  if (!groupsData) return { villages: [] };

  const scoutGroups = Object.entries(groupsData).map(([name, id]) => ({ id, name }));

  return {
    villages: [{
      id: 'all',
      name: 'Alla kårer',
      ScoutGroups: scoutGroups,
    }],
  };
}

/**
 * TanStack Query hook that fetches project list, question metadata, and group list.
 * Uses dependent queries: questions and groups are only fetched once the project ID is known.
 *
 * @returns {{ projectId: number|null, statistics: string[], statisticSubQuestions: Object, villagesData: Object, isLoading: boolean, error: Error|null }}
 */
export default function useProjectQueries() {
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: Infinity,
  });

  const projectId = useMemo(() => {
    if (!projectsData) return null;
    const ids = Object.keys(projectsData);
    return ids.length > 0 ? Number(ids[0]) : null;
  }, [projectsData]);

  const {
    data: questionsData,
    isLoading: questionsLoading,
    error: questionsError,
  } = useQuery({
    queryKey: ['questions', projectId],
    queryFn: () => fetchQuestions(/** @type {number} */ (projectId)),
    enabled: !!projectId,
    staleTime: Infinity,
  });

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ['groups', projectId],
    queryFn: () => fetchGroups(/** @type {number} */ (projectId)),
    enabled: !!projectId,
    staleTime: Infinity,
  });

  const { statistics, statisticSubQuestions } = useMemo(
    () => buildChipData(/** @type {any} */ (questionsData)),
    [questionsData],
  );

  const villagesData = useMemo(
    () => buildVillagesData(/** @type {any} */ (groupsData)),
    [groupsData],
  );

  return {
    projectId,
    statistics,
    statisticSubQuestions,
    villagesData,
    isLoading: projectsLoading || questionsLoading || groupsLoading,
    error: projectsError || questionsError || groupsError,
  };
}
