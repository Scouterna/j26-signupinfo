import { Box, Typography } from "@mui/material";
import { useProjectConfig } from "../context/ProjectConfigContext.jsx";
import QuestionRow from "./QuestionRow.jsx";

/**
 * @typedef {{ id: number | string, name: string, num_participants?: number, stats?: Record<string, any> }} ScoutGroupItem
 */

/**
 * Build counts and pre-resolved groups for the "num_participants" stat.
 * @param {ScoutGroupItem[]} selectedScoutGroups
 * @param {number} totalParticipants
 * @returns {{ counts: Record<string, number>, groups: Record<string, { id: number|string, name: string }[]> }}
 */
function buildNumParticipantsStatData(selectedScoutGroups, totalParticipants) {
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {Record<string, { id: number|string, name: string }[]>} */
  const groups = {};

  if (selectedScoutGroups.length === 0) {
    counts["Totalt"] = totalParticipants;
    groups["Totalt"] = [];
  } else {
    for (const g of selectedScoutGroups) {
      const label = g.name ?? String(g.id);
      counts[label] = g.num_participants ?? 0;
      groups[label] = [{ id: g.id, name: g.name }];
    }
  }
  return { counts, groups };
}

/**
 * Returns true if a question data value has no usable data.
 * @param {any} d
 */
function hasNoData(d) {
  return (
    typeof d !== "number" &&
    (Array.isArray(d) ? d.length === 0 : Object.keys(d).length === 0)
  );
}

/**
 * A single statistic section card. Computes question entries from raw stat data
 * and renders them as a list of QuestionRows.
 *
 * @param {object} props
 * @param {string} props.statName
 * @param {string[] | null | undefined} props.activeSubQs - selected sub-question IDs, or null for all
 * @param {(sectionId: string) => Record<string, any>} props.getStatisticData
 * @param {ScoutGroupItem[]} props.selectedScoutGroups
 * @param {number} props.totalParticipants
 */
export default function StatisticCard({
  statName,
  activeSubQs,
  getStatisticData,
  selectedScoutGroups,
  totalParticipants,
}) {
  const { sectionIdToText, sectionQuestions } = useProjectConfig();

  const isNumParticipants = statName === "num_participants";

  /** @type {[string, any][]} */
  let questionEntries;
  if (isNumParticipants) {
    const { counts, groups } = buildNumParticipantsStatData(
      selectedScoutGroups,
      totalParticipants
    );
    questionEntries = [["_direct", { counts, groups }]];
  } else {
    const sectionData = getStatisticData(statName);
    const orderedIds = sectionQuestions[statName] ?? Object.keys(sectionData);
    if (Array.isArray(activeSubQs)) {
      const dataMap = new Map(
        orderedIds
          .filter((qId) => qId in sectionData)
          .map((qId) => /** @type {[string, any]} */ ([qId, sectionData[qId]]))
      );
      questionEntries = activeSubQs.map(
        (qId) => /** @type {[string, any]} */ ([qId, dataMap.get(qId) ?? {}])
      );
    } else {
      questionEntries = orderedIds
        .map((qId) => /** @type {[string, any]} */ ([qId, qId in sectionData ? sectionData[qId] : {}]));
    }
    questionEntries = [...questionEntries].sort(([, a], [, b]) => {
      if (hasNoData(a) === hasNoData(b)) return 0;
      return hasNoData(a) ? 1 : -1;
    });
  }

  const numericTotal = isNumParticipants
    ? 0
    : questionEntries.reduce((sum, [, v]) => (typeof v === "number" ? sum + v : sum), 0);

  return (
    <Box
      sx={{
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        breakInside: "avoid",
        marginBottom: "16px",
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight="700"
        sx={{ marginBottom: "16px", color: "#000000" }}
      >
        {sectionIdToText[statName] ?? statName}
      </Typography>

      {questionEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ingen data tillgänglig
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {questionEntries.map(([questionId, questionData], qIndex) => (
            <QuestionRow
              key={questionId}
              questionId={questionId}
              questionData={questionData}
              qIndex={qIndex}
              numericTotal={numericTotal}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
