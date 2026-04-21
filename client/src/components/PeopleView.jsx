import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { SmartTable } from "./smart-table/SmartTable";
import {
  PATH_SEPARATOR,
  joinPath,
  getColumnMeta,
  createColumns,
  useChipTable,
} from "./smart-table/chipTable.js";
import useIndividualsByGroup from "../hooks/useIndividualsByGroup.js";
import useSearchMembers from "../hooks/useSearchMembers.js";
import useIndividualResponse from "../hooks/useIndividualResponse.js";
import { useProjectConfig } from "../context/ProjectConfigContext.jsx";

const FIRST_COLUMN = {
  accessorKey: "name",
  header: "Person",
  size: 240,
  minSize: 160,
};

/**
 * Builds the per-person table's column IDs from the shared chip-selector state.
 * Per-person responses are one-value-per-question, so only 2-segment paths —
 * no aggregated 3-segment choice-count paths.
 *
 * @param {string[]} selectedStatistics
 * @param {Record<string, string[] | null>} selectedSubQuestions
 * @param {Record<string, string[]>} sectionQuestions
 * @returns {Set<string>}
 */
function getColumnIds(
  selectedStatistics,
  selectedSubQuestions,
  sectionQuestions,
) {
  const ids = new Set(["name"]);

  /** @param {string} sectionId @param {string[] | null | undefined} activeSubQs */
  const addSection = (sectionId, activeSubQs) => {
    const questionIds = sectionQuestions[sectionId];
    if (!questionIds) return; // manual sections (Kön/Avgift) aren't in per-person responses
    const qIds = Array.isArray(activeSubQs) ? activeSubQs : questionIds;
    for (const qId of qIds) ids.add(joinPath(sectionId, qId));
  };

  for (const sectionId of selectedStatistics) {
    if (sectionId === "num_participants") continue;
    addSection(sectionId, undefined);
  }
  for (const [sectionId, activeSubQs] of Object.entries(selectedSubQuestions)) {
    addSection(sectionId, activeSubQs);
  }

  return ids;
}

/**
 * @param {any} raw
 * @param {string | undefined} questionType
 * @param {Record<string, string>} questionIdToText
 * @returns {string | number}
 */
function coerceResponseValue(raw, questionType, questionIdToText) {
  if (raw == null || raw === "") return "";
  if (questionType === "boolean") {
    // Scoutnet returns the chosen option's ID for booleans — in this project
    // that's "1" = checked, "0" = unchecked (see _j26_question_hack_individual
    // on the backend, which relies on the same convention).
    if (raw === true || raw === "true" || raw === 1 || raw === "1" || raw === "checked")
      return "Ja";
    if (raw === false || raw === "false" || raw === 0 || raw === "0" || raw === "unchecked")
      return "Nej";
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => questionIdToText[String(v)] ?? String(v)).join(", ");
  }
  if (typeof raw === "object") {
    return Object.keys(raw)
      .map((k) => questionIdToText[k] ?? k)
      .join(", ");
  }
  if (typeof raw === "number") return raw;
  const str = String(raw);
  return questionIdToText[str] ?? str;
}

/**
 * @param {Array<{ member_no: number, name: string, responses: Record<string, any> }>} individuals
 * @param {Set<string>} columnIds
 * @param {Record<string, string>} questionTypes
 * @param {Record<string, string>} questionIdToText
 */
function transformToRows(
  individuals,
  columnIds,
  questionTypes,
  questionIdToText,
) {
  /** @type {{ columnId: string, questionId: string }[]} */
  const statColumns = [];
  for (const columnId of columnIds) {
    if (columnId === "name") continue;
    const qId = columnId.split(PATH_SEPARATOR).pop();
    if (qId) statColumns.push({ columnId, questionId: qId });
  }

  return individuals.map((person) => {
    /** @type {Record<string, any>} */
    const row = { id: person.member_no, name: person.name };
    const responses = person.responses ?? {};
    for (const { columnId, questionId } of statColumns) {
      row[columnId] = coerceResponseValue(
        responses[questionId],
        questionTypes[questionId],
        questionIdToText,
      );
    }
    return row;
  });
}

/**
 * Search results come back with group names (not IDs). To let the user click a
 * result and jump to that person's Kår, we build a name → id lookup from the
 * project's scoutGroups list.
 *
 * @param {Array<{ id: number, name: string }>} scoutGroups
 */
function buildGroupNameToId(scoutGroups) {
  /** @type {Record<string, number>} */
  const map = {};
  for (const g of scoutGroups) map[g.name] = g.id;
  return map;
}

/**
 * "Personer" view — pick a kår, search for a person, and toggle per-question
 * columns via the shared StatisticChipSelector (same chips as other views).
 *
 * Three interaction modes:
 * - Search mode (query typed): hits /search_member across the whole project,
 *   shows minimal identity info.
 * - Detail mode (search hit clicked): hits /individualinfo/{member_id} and
 *   renders a single-row table using the chip-driven stat columns.
 * - Group mode (Kår picked, no query, no detail): hits /individualinfo/group
 *   and shows the chip-driven stat columns for everyone in the group.
 *
 * @param {object} props
 * @param {Array<{ id: number, name: string }>} props.scoutGroups
 * @param {number|null} props.projectId
 * @param {string[]} props.selectedStatistics
 * @param {Record<string, string[] | null>} props.selectedSubQuestions
 * @param {boolean} [props.isSingleGroup]
 */
export default function PeopleView({
  scoutGroups,
  projectId,
  selectedStatistics,
  selectedSubQuestions,
  isSingleGroup = false,
}) {
  const { sectionQuestions, questionIdToText, questionTypes, questionChoices } =
    useProjectConfig();

  // Initialize groupId lazily so that single-group projects load the group's
  // individuals on the very first render — otherwise the user briefly sees the
  // "Välj en kår…" empty state before a useEffect gets a chance to run.
  const [groupId, setGroupId] = useState(/** @type {number|null} */ (
    scoutGroups.length === 1 ? scoutGroups[0].id : null
  ));
  const [query, setQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(
    /** @type {{ member_no: number, name: string, born: string, registration_group: string } | null} */ (null),
  );

  // Covers the case where scoutGroups resolves to a single entry after mount
  // (e.g. project switch while the Personer tab stays mounted). Initial-mount
  // single-group selection is handled by the useState initializer above.
  useEffect(() => {
    if (scoutGroups.length === 1 && groupId !== scoutGroups[0].id) {
      setGroupId(scoutGroups[0].id);
    }
  }, [scoutGroups, groupId]);

  const isSearching = query.trim().length > 0;
  const isDetail = !isSearching && !!selectedMember;
  const isGroupList = !isSearching && !selectedMember;

  // Group-list mode: only loads when no query, no selected member, and a Kår is picked.
  const {
    individuals,
    loading: groupLoading,
    error: groupError,
  } = useIndividualsByGroup(
    isGroupList ? projectId : null,
    isGroupList ? groupId : null,
  );

  // Detail mode: fetches one person's responses.
  const {
    responses: detailResponses,
    loading: detailLoading,
    error: detailError,
  } = useIndividualResponse(
    isDetail ? projectId : null,
    isDetail ? selectedMember?.member_no ?? null : null,
  );

  // Search mode: hits /search_member. Enabled only while a query is typed.
  const {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    tooMany,
    enabled: searchEnabled,
  } = useSearchMembers(isSearching ? projectId : null, query);

  // Rows for the chip-driven table: either the whole group list or a synthetic
  // single-person array built from the detail fetch. Keeps the table logic
  // unchanged regardless of which mode we're in.
  const individualList = useMemo(() => {
    if (isDetail) {
      if (!selectedMember || !detailResponses) return [];
      return [
        {
          member_no: selectedMember.member_no,
          name: selectedMember.name,
          born: selectedMember.born,
          responses: detailResponses,
        },
      ];
    }
    return individuals ?? [];
  }, [isDetail, selectedMember, detailResponses, individuals]);

  const columnIds = useMemo(
    () =>
      getColumnIds(selectedStatistics, selectedSubQuestions, sectionQuestions),
    [selectedStatistics, selectedSubQuestions, sectionQuestions],
  );

  const columnMeta = useMemo(
    () =>
      getColumnMeta(
        columnIds,
        questionTypes,
        questionChoices,
        questionIdToText,
        { booleanAsChoice: true },
      ),
    [columnIds, questionTypes, questionChoices, questionIdToText],
  );

  const rows = useMemo(
    () => transformToRows(individualList, columnIds, questionTypes, questionIdToText),
    [individualList, columnIds, questionTypes, questionIdToText],
  );

  const columns = useMemo(
    () =>
      createColumns(columnIds, columnMeta, questionIdToText, {
        firstColumn: FIRST_COLUMN,
      }),
    [columnIds, columnMeta, questionIdToText],
  );

  const table = useChipTable(rows, columns);

  const groupNameToId = useMemo(() => buildGroupNameToId(scoutGroups), [scoutGroups]);

  const handleSearchHit = (
    /** @type {{ member_no: number, name: string, born: string, registration_group: string }} */ hit,
  ) => {
    const resolvedId = groupNameToId[hit.registration_group];
    if (resolvedId != null) setGroupId(resolvedId);
    setSelectedMember(hit);
    setQuery("");
  };

  // Changing Kår clears any detail selection — user wants the new group's list.
  const handleGroupChange = (/** @type {number} */ newId) => {
    setGroupId(newId);
    setSelectedMember(null);
  };

  const hasGroup = groupId != null;
  const groupList = individuals ?? [];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        minHeight: 0,
        flex: 1,
      }}
    >
      <Box
        sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}
      >
        {!isSingleGroup && (
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="people-kar-label">Kår</InputLabel>
            <Select
              labelId="people-kar-label"
              label="Kår"
              value={groupId ?? ""}
              onChange={(e) => handleGroupChange(Number(e.target.value))}
            >
              {scoutGroups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <TextField
          size="small"
          placeholder="Sök efter person..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            flex: "1 1 320px",
            maxWidth: 480,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              backgroundColor: query ? "#fff" : "#fafafa",
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setQuery("")}
                    aria-label="Rensa sökning"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        {isGroupList && hasGroup && (
          <Typography variant="body2" color="text.secondary">
            {groupList.length} personer
          </Typography>
        )}
        {isSearching && searchEnabled && searchResults != null && !tooMany && (
          <Typography variant="body2" color="text.secondary">
            {searchResults.length} träffar
          </Typography>
        )}
      </Box>

      {isDetail && selectedMember && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setSelectedMember(null)}
          >
            Tillbaka till kåren
          </Button>
          <Typography variant="body2" color="text.secondary">
            Visar {selectedMember.name}
          </Typography>
        </Box>
      )}

      {isSearching ? (
        <SearchResultsPanel
          enabled={searchEnabled}
          loading={searchLoading}
          error={searchError}
          tooMany={tooMany}
          results={searchResults ?? []}
          onSelect={handleSearchHit}
        />
      ) : isDetail ? (
        detailLoading ? (
          <LoadingPanel />
        ) : detailError ? (
          <ErrorPanel message={detailError.message || "Kunde inte hämta personen."} />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              border: 1,
              borderColor: "grey.300",
              borderRadius: 1,
              overflow: "hidden",
              minHeight: 360,
            }}
          >
            <SmartTable table={table} />
          </Box>
        )
      ) : !hasGroup ? (
        <EmptyPanel message="Välj en kår eller sök efter en person" />
      ) : groupError ? (
        <ErrorPanel message={groupError.message || "Kunde inte hämta personer."} />
      ) : groupLoading || individuals === null ? (
        // Guard against the "no individuals" empty state rendering while the
        // request is still inflight — groupList derives from `individuals ?? []`
        // so a null (unresolved) response would otherwise look like an empty
        // group.
        <LoadingPanel />
      ) : groupList.length === 0 ? (
        <EmptyPanel message="Inga personer i vald kår" />
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            border: 1,
            borderColor: "grey.300",
            borderRadius: 1,
            overflow: "hidden",
            minHeight: 360,
          }}
        >
          <SmartTable table={table} />
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {object} props
 * @param {boolean} props.enabled
 * @param {boolean} props.loading
 * @param {Error|null} props.error
 * @param {boolean} props.tooMany
 * @param {Array<{ member_no: number, name: string, born: string, registration_group: string, member_group: string, email?: string, mobile?: string }>} props.results
 * @param {(hit: any) => void} props.onSelect
 */
function SearchResultsPanel({
  enabled,
  loading,
  error,
  tooMany,
  results,
  onSelect,
}) {
  if (!enabled) {
    return <EmptyPanel message="Skriv minst 2 tecken för att söka" />;
  }
  if (loading) return <LoadingPanel />;
  if (tooMany) {
    return (
      <Alert severity="info" sx={{ borderRadius: "12px" }}>
        För många träffar — förfina din sökning.
      </Alert>
    );
  }
  if (error) {
    return <ErrorPanel message={error.message || "Sökningen misslyckades."} />;
  }
  if (results.length === 0) {
    return <EmptyPanel message="Inga personer matchar sökningen" />;
  }

  return (
    <TableContainer
      component={Box}
      sx={{
        border: 1,
        borderColor: "grey.300",
        borderRadius: 1,
        overflow: "auto",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Person</TableCell>
            <TableCell>Född</TableCell>
            <TableCell>Registrerad kår</TableCell>
            <TableCell>Ordinarie kår</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((hit) => (
            <TableRow
              key={hit.member_no}
              hover
              onClick={() => onSelect(hit)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell sx={{ color: "primary.main", fontWeight: 500 }}>
                {hit.name}
              </TableCell>
              <TableCell>{hit.born}</TableCell>
              <TableCell>{hit.registration_group}</TableCell>
              <TableCell>{hit.member_group}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @param {{ message: string }} props */
function EmptyPanel({ message }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderRadius: "12px",
        border: "2px dashed",
        borderColor: "divider",
      }}
    >
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function LoadingPanel() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderRadius: "12px",
      }}
    >
      <CircularProgress size={32} />
    </Box>
  );
}

/** @param {{ message: string }} props */
function ErrorPanel({ message }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderRadius: "12px",
        color: "error.main",
      }}
    >
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}
