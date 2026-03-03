import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { SubQuestionValues } from "./QuestionAnswerValues.jsx";
import StatRow from "./StatRow.jsx";
import QuestionStats from "./QuestionStats.jsx";
import { useProjectConfig } from "../context/ProjectConfigContext.jsx";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";

/**
 * Renders a single question entry within a statistic card.
 * Owns all per-question classification logic and selects the correct renderer.
 *
 * @param {object} props
 * @param {string} props.questionId
 * @param {any} props.questionData
 * @param {number} props.qIndex - row index for zebra striping
 * @param {number} props.numericTotal - total for StatRow percentage bars
 */
export default function QuestionRow({ questionId, questionData, qIndex, numericTotal }) {
  const { booleanQuestionIds, questionIdToText } = useProjectConfig();
  const { onReplaceSelection } = useGroupSelection();

  const isNumParticipants = questionId === "_direct";
  const isNumeric = typeof questionData === "number";
  const isTextAnswers = Array.isArray(questionData);
  const isBooleanQuestion = isNumeric && booleanQuestionIds.has(questionId);
  const showHeader = !isNumParticipants && !isNumeric;

  const effectiveAnswerCounts = useMemo(
    () =>
      isTextAnswers
        ? questionData.reduce((/** @type {Record<string, number>} */ acc, /** @type {string} */ text) => {
            const key = text || "(tomt)";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        : questionData,
    [isTextAnswers, questionData]
  );

  const hasNoAnswers =
    showHeader &&
    !isBooleanQuestion &&
    Object.keys(effectiveAnswerCounts).length === 0;

  return (
    <Box
      sx={{
        borderRadius: "6px",
        backgroundColor: qIndex % 2 === 1 ? "rgba(0, 0, 0, 0.06)" : "transparent",
        padding: "0 8px",
        margin: "0 -8px",
      }}
    >
      {showHeader && (
        <Typography
          variant="body2"
          fontWeight="700"
          sx={{ marginBottom: "6px", color: "#000000" }}
        >
          {questionIdToText[questionId] ?? questionId}
        </Typography>
      )}

      {hasNoAnswers ? (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
          Inga svar
        </Typography>
      ) : isNumParticipants ? (
        <SubQuestionValues
          answerCounts={questionData.counts}
          groups={questionData.groups}
          isLoadingGroups={false}
          onRequestGroups={() => {}}
          onSelectByAnswer={onReplaceSelection}
          idToDisplayText={questionIdToText}
        />
      ) : isNumeric && !isBooleanQuestion ? (
        <StatRow
          label={questionIdToText[questionId] ?? questionId}
          value={questionData}
          total={numericTotal}
        />
      ) : (
        <QuestionStats
          questionId={questionId}
          answerCounts={isBooleanQuestion ? { checked: questionData } : effectiveAnswerCounts}
          onSelectByAnswer={isTextAnswers ? undefined : onReplaceSelection}
        />
      )}
    </Box>
  );
}
