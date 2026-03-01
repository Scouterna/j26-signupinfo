import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Backdrop,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

import ExpandCollapseButton from "./ExpandCollapseButton.jsx";
import StatRow from "./StatRow.jsx";

/**
 * @typedef {{ id: number, name: string }} GroupRef
 */

/**
 * Renders grouped answer counts with expandable scout group lists (lazily loaded).
 *
 * @param {object} props
 * @param {Record<string, number>} props.counts - answer label -> count
 * @param {Record<string, GroupRef[]> | null} props.groups - null until lazily loaded
 * @param {boolean} props.isLoadingGroups
 * @param {() => void} props.onRequestGroups - called on first expand when groups are null
 * @param {((ids: number[], answerName: string) => void)} [props.onSelectByAnswer]
 * @param {Record<string, string>} [props.idToDisplayText]
 */
function GroupedAnswerValues({
  counts,
  groups,
  isLoadingGroups,
  onRequestGroups,
  onSelectByAnswer,
  idToDisplayText = {},
}) {
  const getDisplayText = (/** @type {string} */ id) => idToDisplayText[id] ?? id;
  const [expandedAnswers, setExpandedAnswers] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [pendingAnswer, setPendingAnswer] = useState(/** @type {{ answerName: string, displayLabel: string } | null} */ (null));

  const toggleExpanded = (/** @type {string} */ answerName) => {
    if (!expandedAnswers[answerName] && groups === null) {
      onRequestGroups();
    }
    setExpandedAnswers((prev) => ({
      ...prev,
      [answerName]: !prev[answerName],
    }));
  };

  const handleFilterClick = (/** @type {string} */ answerName, /** @type {string} */ displayLabel) => {
    if (!onSelectByAnswer) return;
    if (groups !== null) {
      const resolvedGroups = groups[answerName] ?? [];
      onSelectByAnswer(resolvedGroups.map((g) => g.id), displayLabel);
    } else {
      setPendingAnswer({ answerName, displayLabel });
      onRequestGroups();
    }
  };

  useEffect(() => {
    if (groups !== null && pendingAnswer !== null) {
      const resolvedGroups = groups[pendingAnswer.answerName] ?? [];
      onSelectByAnswer?.(resolvedGroups.map((g) => g.id), pendingAnswer.displayLabel);
      setPendingAnswer(null);
    }
  }, [groups, pendingAnswer, onSelectByAnswer]);

  const sortedEntries = Object.entries(counts).sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) return countDiff;
    return a[0].localeCompare(b[0], "sv");
  });

  const total = sortedEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <>
      <Backdrop
        open={isLoadingGroups && pendingAnswer !== null}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: "#fff" }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {sortedEntries.map(([answerName, count]) => {
          const isExpanded = expandedAnswers[answerName] || false;
          const resolvedGroups = groups?.[answerName] ?? null;
          const displayLabel = getDisplayText(answerName) || "(tomt)";

          return (
            <Box key={answerName}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <ExpandCollapseButton
                  isExpanded={isExpanded}
                  onClick={() => toggleExpanded(answerName)}
                  sx={{ marginRight: "4px", marginLeft: "-8px", flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <StatRow label={displayLabel} value={count} total={total} />
                </Box>
                {onSelectByAnswer && (
                  <Tooltip title="Välj dessa kårer">
                    <IconButton
                      size="small"
                      onClick={() => handleFilterClick(answerName, displayLabel)}
                      aria-label="Välj dessa kårer"
                      sx={{ flexShrink: 0 }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {isExpanded && (
                <Box sx={{ marginLeft: "32px", marginTop: "4px" }}>
                  {isLoadingGroups ? (
                    <CircularProgress size={16} sx={{ mt: 0.5 }} />
                  ) : resolvedGroups && resolvedGroups.length > 0 ? (
                    resolvedGroups.map((group) => (
                      <Box
                        key={group.id}
                        sx={{
                          padding: "4px 8px",
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                          borderRadius: "4px",
                          marginTop: "2px",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {group.name}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Inga kårer
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </>
  );
}

/**
 * Renders values for a single question from the summary endpoint.
 *
 * @param {object} props
 * @param {Record<string, number> | number} props.answerCounts
 * @param {Record<string, GroupRef[]> | null} props.groups - null until lazily loaded
 * @param {boolean} [props.isLoadingGroups]
 * @param {() => void} [props.onRequestGroups]
 * @param {((ids: number[], answerName: string) => void)} [props.onSelectByAnswer]
 * @param {Record<string, string>} [props.idToDisplayText]
 */
function SubQuestionValues({
  answerCounts,
  groups = null,
  isLoadingGroups = false,
  onRequestGroups = () => {},
  onSelectByAnswer,
  idToDisplayText = {},
}) {
  if (typeof answerCounts === "number") {
    return <StatRow label="" value={answerCounts} total={answerCounts} />;
  }

  return (
    <GroupedAnswerValues
      counts={answerCounts}
      groups={groups}
      isLoadingGroups={isLoadingGroups}
      onRequestGroups={onRequestGroups}
      onSelectByAnswer={onSelectByAnswer}
      idToDisplayText={idToDisplayText}
    />
  );
}

export { SubQuestionValues, GroupedAnswerValues };
