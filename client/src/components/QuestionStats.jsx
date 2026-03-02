import { useMemo, useCallback } from 'react';
import useQuestionGroupResponse from '../hooks/useQuestionGroupResponse.js';
import { SubQuestionValues } from './QuestionAnswerValues.jsx';

/**
 * Per-question component that owns the lazy group-loading lifecycle.
 * This needs to be its own component so each question gets its own hook instance.
 *
 * @param {object} props
 * @param {string} props.questionId
 * @param {Record<string, number> | number} props.answerCounts
 * @param {number|null} props.projectId
 * @param {Set<number>} props.selectedGroupIds
 * @param {Record<number, string>} props.groupIdToName
 * @param {((ids: number[], answerName: string) => void)} [props.onSelectByAnswer]
 * @param {Record<string, string>} [props.idToDisplayText]
 */
export default function QuestionStats({
  questionId,
  answerCounts,
  projectId,
  selectedGroupIds,
  groupIdToName,
  onSelectByAnswer,
  idToDisplayText = {},
}) {
  const { data: responseData, isLoading, refetch } = useQuestionGroupResponse(
    projectId,
    questionId,
    selectedGroupIds,
  );

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
      idToDisplayText={idToDisplayText}
    />
  );
}
