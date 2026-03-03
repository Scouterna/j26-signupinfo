import { useMemo, useCallback } from 'react';
import useQuestionGroupResponse from '../hooks/useQuestionGroupResponse.js';
import { SubQuestionValues } from './QuestionAnswerValues.jsx';
import { useProjectConfig } from '../context/ProjectConfigContext.jsx';
import { useGroupSelection } from '../context/GroupSelectionContext.jsx';

/**
 * Per-question component that owns the lazy group-loading lifecycle.
 * This needs to be its own component so each question gets its own hook instance.
 *
 * Reads projectId, groupIdToName, questionIdToText, sectionIdToText, and
 * booleanQuestionIds from ProjectConfigContext. Reads selectedGroupIds from
 * GroupSelectionContext.
 *
 * @param {object} props
 * @param {string} props.questionId
 * @param {Record<string, number> | number} props.answerCounts
 * @param {((ids: number[], answerName: string) => void) | undefined} [props.onSelectByAnswer]
 */
export default function QuestionStats({
  questionId,
  answerCounts,
  onSelectByAnswer,
}) {
  const {
    projectId,
    groupIdToName,
    questionIdToText,
    sectionIdToText,
    booleanQuestionIds,
  } = useProjectConfig();
  const { selectedGroupIds } = useGroupSelection();

  const { data: responseData, isLoading, refetch } = useQuestionGroupResponse(
    projectId,
    questionId,
    selectedGroupIds,
  );

  const idToDisplayText = useMemo(
    () => ({ ...sectionIdToText, ...questionIdToText }),
    [sectionIdToText, questionIdToText]
  );

  const effectiveIdToDisplayText = useMemo(() => {
    if (!booleanQuestionIds.has(questionId)) return idToDisplayText;
    return { ...idToDisplayText, checked: questionIdToText[questionId] ?? questionId };
  }, [booleanQuestionIds, questionId, idToDisplayText, questionIdToText]);

  const groups = useMemo(() => {
    if (!responseData) return null;
    const questionData = responseData[questionId];
    if (!questionData) return {};
    return Object.fromEntries(
      Object.entries(questionData).map(([answerId, groupIds]) => [
        answerId,
        groupIds.map((id) => ({ id, name: groupIdToName[id] ?? String(id) })),
      ])
    );
  }, [responseData, questionId, groupIdToName]);

  const onRequestGroups = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <SubQuestionValues
      answerCounts={answerCounts}
      groups={groups}
      isLoadingGroups={isLoading}
      onRequestGroups={onRequestGroups}
      onSelectByAnswer={onSelectByAnswer}
      idToDisplayText={effectiveIdToDisplayText}
    />
  );
}
