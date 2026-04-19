import { useMemo } from 'react';
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
 * @param {(ids: number[], answerName: string) => void} [props.onSelectByAnswer]
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
    questionTypes,
  } = useProjectConfig();
  const { selectedGroupIds } = useGroupSelection();

  const { data: responseData, isLoading, refetch } = useQuestionGroupResponse(
    projectId,
    questionId,
    selectedGroupIds,
  );

  const effectiveIdToDisplayText = useMemo(() => {
    const base = { ...sectionIdToText, ...questionIdToText };
    if (booleanQuestionIds.has(questionId)) {
      return { ...base, checked: questionIdToText[questionId] ?? questionId };
    }
    if (questionTypes[questionId] === 'text') {
      return { ...base, responded: questionIdToText[questionId] ?? questionId };
    }
    return base;
  }, [booleanQuestionIds, questionId, sectionIdToText, questionIdToText, questionTypes]);

  const groups = useMemo(() => {
    if (!responseData) return null;
    const questionData = responseData[questionId];
    if (!questionData) return {};
    return Object.fromEntries(
      Object.entries(questionData).map(([answerId, groupIds]) => [
        answerId,
        groupIds.map((id) => {
          const numId = Number(id);
          return { id: numId, name: groupIdToName[numId] ?? String(id) };
        }),
      ])
    );
  }, [responseData, questionId, groupIdToName]);

  return (
    <SubQuestionValues
      answerCounts={answerCounts}
      groups={groups}
      isLoadingGroups={isLoading}
      onRequestGroups={refetch}
      onSelectByAnswer={onSelectByAnswer}
      idToDisplayText={effectiveIdToDisplayText}
    />
  );
}
