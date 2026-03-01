import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchQuestions, fetchGroups } from '../services/api';

const MANUAL_STATISTICS = ['Kön', 'Avgift'];

/** Built-in table column: participant count per scout group. Shown as chip option. */
const DELTAGARE_STAT_ID = 'num_participants';

/**
 * Transforms the raw questions response into chip selector data.
 * Preserves section and question IDs for matching with stats/groupinfo endpoints.
 *
 * @param {Record<string, { text: string, questions: Record<string, { text: string, type?: string }> }> | undefined} questionsData
 * @returns {{ statistics: string[], statisticSubQuestions: Record<string, string[]>, sectionIdToText: Record<string, string>, questionIdToText: Record<string, string>, booleanQuestionIds: Set<string> }}
 */
function buildChipData(questionsData) {
  /** @type {string[]} */
  const statistics = [DELTAGARE_STAT_ID, ...MANUAL_STATISTICS];
  /** @type {Record<string, string[]>} */
  const statisticSubQuestions = {};
  /** @type {Record<string, string>} */
  const sectionIdToText = {
    [DELTAGARE_STAT_ID]: 'Deltagare',
    Kön: 'Kön',
    Avgift: 'Avgift',
  };
  /** @type {Record<string, string>} */
  const questionIdToText = {};
  /** @type {Set<string>} */
  const booleanQuestionIds = new Set();

  if (!questionsData) {
    return { statistics, statisticSubQuestions, sectionIdToText, questionIdToText, booleanQuestionIds };
  }

  const sectionEntries = Object.entries(questionsData);
  const sortedSections = sectionEntries
    .sort(([, a], [, b]) => (a.text || '').localeCompare(b.text || '', 'sv'));

  for (const [sectionId, section] of sortedSections) {
    sectionIdToText[sectionId] = section.text || sectionId;

    const questionEntries = Object.entries(section.questions || {});
    const sortedQuestions = questionEntries
      .sort(([, a], [, b]) => (a.text || '').localeCompare(b.text || '', 'sv'));

    const questionIds = sortedQuestions.map(([qId]) => qId);
    for (const [qId, q] of questionEntries) {
      questionIdToText[qId] = q.text || qId;
      if (q.type === 'boolean') {
        booleanQuestionIds.add(qId);
      }
      if (q.choices && typeof q.choices === 'object') {
        for (const [choiceId, choiceText] of Object.entries(q.choices)) {
          questionIdToText[choiceId] = choiceText;
        }
      }
    }

    statistics.push(sectionId);

    if (questionIds.length > 1) {
      statisticSubQuestions[sectionId] = questionIds;
    }
  }

  return {
    statistics,
    statisticSubQuestions,
    sectionIdToText,
    questionIdToText,
    booleanQuestionIds,
  };
}

/**
 * Transforms the groups endpoint response ({id: name} dict) into the
 * villages structure expected by the selector components.
 *
 * @param {Record<number, string> | undefined} groupsData
 * @returns {{ villages: Array<{ id: string, name: string, ScoutGroups: Array<{ id: number, name: string }> }> }}
 */
function buildVillagesData(groupsData) {
  if (!groupsData) return { villages: [] };

  const scoutGroups = Object.entries(groupsData).map(([id, name]) => ({ id: Number(id), name }));

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
 * @returns {{ projectId: number|null, statistics: string[], statisticSubQuestions: Object, sectionIdToText: Object, questionIdToText: Object, booleanQuestionIds: Set<string>, villagesData: Object, isLoading: boolean, error: Error|null }}
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

  const { statistics, statisticSubQuestions, sectionIdToText, questionIdToText, booleanQuestionIds } = useMemo(
    () => buildChipData(/** @type {any} */ (questionsData)),
    [questionsData],
  );

  const villagesData = useMemo(
    () => buildVillagesData(/** @type {any} */ (groupsData)),
    [groupsData],
  );

  /** @type {Record<number, string>} */
  const groupIdToName = useMemo(() => {
    if (!groupsData) return {};
    return Object.fromEntries(
      Object.entries(/** @type {any} */ (groupsData)).map(([id, name]) => [Number(id), name])
    );
  }, [groupsData]);

  return {
    projectId,
    statistics,
    statisticSubQuestions,
    sectionIdToText,
    questionIdToText,
    booleanQuestionIds,
    villagesData,
    groupIdToName,
    isLoading: projectsLoading || questionsLoading || groupsLoading,
    error: projectsError || questionsError || groupsError,
  };
}
