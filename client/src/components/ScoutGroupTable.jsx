import { useMemo, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SmartTable } from "./smart-table/SmartTable";

// Default columns to show initially (only basic info)
const DEFAULT_VISIBLE_COLUMNS = new Set(["name"]);

// Separator for column IDs (using a character unlikely to appear in names)
const PATH_SEPARATOR = "§";

/**
 * Builds a hierarchical tree structure from all scout groups' stats.
 * Returns an array of category nodes, each with children (sub-questions or leaves).
 */
function buildStatsHierarchy(scoutGroups) {
  // Collect all unique paths and their types across all scout groups
  const pathsMap = new Map(); // path -> { type, leafName, categoryName, subQuestionName? }

  scoutGroups.forEach((group) => {
    if (!group.stats || typeof group.stats !== "object") return;

    Object.entries(group.stats).forEach(([categoryName, categoryData]) => {
      if (!categoryData || typeof categoryData !== "object") return;

      Object.entries(categoryData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (typeof value === "object" && !Array.isArray(value)) {
          // Nested sub-question with answer options
          Object.keys(value).forEach((answerKey) => {
            const columnId = [categoryName, key, answerKey].join(PATH_SEPARATOR);
            if (!pathsMap.has(columnId)) {
              pathsMap.set(columnId, {
                type: "nestedLeaf",
                leafName: answerKey,
                categoryName,
                subQuestionName: key,
              });
            }
          });
        } else {
          // Direct value (number, string, or array) - this is a leaf
          const columnId = [categoryName, key].join(PATH_SEPARATOR);
          if (!pathsMap.has(columnId)) {
            pathsMap.set(columnId, {
              type: "directLeaf",
              leafName: key,
              categoryName,
            });
          }
        }
      });
    });
  });

  // Build tree structure from collected paths
  const categoriesMap = new Map();

  pathsMap.forEach((info, columnId) => {
    const { categoryName, subQuestionName, leafName, type } = info;

    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        name: categoryName,
        children: new Map(),
      });
    }

    const category = categoriesMap.get(categoryName);

    if (type === "nestedLeaf") {
      // Has a sub-question level
      if (!category.children.has(subQuestionName)) {
        category.children.set(subQuestionName, {
          name: subQuestionName,
          type: "branch",
          children: [],
        });
      }
      category.children.get(subQuestionName).children.push({
        name: leafName,
        type: "leaf",
        columnId,
      });
    } else {
      // Direct leaf under category
      category.children.set(columnId, {
        name: leafName,
        type: "leaf",
        columnId,
      });
    }
  });

  // Convert maps to sorted arrays
  const hierarchy = Array.from(categoriesMap.values())
    .map((category) => ({
      ...category,
      children: Array.from(category.children.values())
        .map((child) => {
          if (child.type === "branch") {
            return {
              ...child,
              children: child.children.sort((a, b) =>
                a.name.localeCompare(b.name, "sv")
              ),
            };
          }
          return child;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return hierarchy;
}

/**
 * Gets all leaf column IDs from a hierarchy node (category or branch).
 */
function getAllLeafIds(node) {
  const ids = [];
  if (node.children) {
    node.children.forEach((child) => {
      if (child.type === "leaf") {
        ids.push(child.columnId);
      } else if (child.type === "branch") {
        ids.push(...getAllLeafIds(child));
      }
    });
  }
  return ids;
}

/**
 * Gets all leaf column IDs from the full hierarchy.
 */
function getAllColumnIdsFromHierarchy(hierarchy) {
  const ids = [];
  hierarchy.forEach((category) => {
    ids.push(...getAllLeafIds(category));
  });
  return ids;
}

/**
 * Gets column IDs that match the chip selector selection.
 * - selectedStatistics: array of stat names (simple stats, no sub-questions)
 * - selectedSubQuestions: { statName: null | string[] } - null = all sub-questions, array = subset
 * - statisticSubQuestions: { statName: string[] } - which stats have sub-questions
 */
function getColumnIdsFromChipSelection(
  hierarchy,
  selectedStatistics,
  selectedSubQuestions,
  statisticSubQuestions
) {
  const ids = new Set(["name", "num_participants"]);
  const hasSubQuestions = (statName) => statName in statisticSubQuestions;

  hierarchy.forEach((category) => {
    const statName = category.name;
    const isSimpleStat =
      selectedStatistics.includes(statName) && !hasSubQuestions(statName);
    const isSubStat = statName in selectedSubQuestions;

    if (!isSimpleStat && !isSubStat) return;

    if (isSimpleStat) {
      getAllLeafIds(category).forEach((id) => ids.add(id));
      return;
    }

    // Stat with sub-questions: filter by selected sub-questions
    const activeSubQs = selectedSubQuestions[statName];
    const includeChild = (subName) =>
      activeSubQs === null ||
      (Array.isArray(activeSubQs) &&
        (subName === "_direct" || activeSubQs.includes(subName)));

    category.children.forEach((child) => {
      if (child.type === "leaf") {
        if (includeChild("_direct")) ids.add(child.columnId);
      } else if (child.type === "branch") {
        if (includeChild(child.name)) {
          getAllLeafIds(child).forEach((id) => ids.add(id));
        }
      }
    });
  });

  return ids;
}

/**
 * For each stat column, determines type (number vs string) and unique string values.
 * Used so string columns get select filter with checklist of options.
 */
function getColumnMeta(scoutGroups, hierarchy) {
  const columnIds = getAllColumnIdsFromHierarchy(hierarchy);
  const meta = new Map();

  columnIds.forEach((columnId) => {
    const values = scoutGroups
      .map((g) => getValueFromPath(g.stats, columnId))
      .filter((v) => v !== "" && v !== null && v !== undefined);

    const allNumeric =
      values.length > 0 && values.every((v) => typeof v === "number");

    if (allNumeric) {
      meta.set(columnId, { type: "number" });
    } else {
      const uniqueValues = [
        ...new Set(
          values.map((v) => (typeof v === "string" ? v : String(v)))
        ),
      ].sort((a, b) => a.localeCompare(b, "sv"));
      meta.set(columnId, { type: "string", uniqueValues });
    }
  });

  return meta;
}

/**
 * Gets the value from a scout group's stats using a column ID path.
 */
function getValueFromPath(stats, columnId) {
  if (!stats) return "";
  const parts = columnId.split(PATH_SEPARATOR);

  let current = stats;
  for (const part of parts) {
    if (current === null || current === undefined) return "";
    if (typeof current !== "object") return "";
    current = current[part];
  }

  // Handle different value types
  if (current === null || current === undefined) return "";
  if (typeof current === "number") return current;
  if (typeof current === "string") return current;
  if (Array.isArray(current)) return current.length;
  return "";
}

/**
 * Transforms scout groups into row data for the table.
 */
function transformToRows(scoutGroups, selectedColumns) {
  return scoutGroups.map((group) => {
    const row = {
      id: group.id,
      name: group.name,
      num_participants: group.num_participants || 0,
    };

    selectedColumns.forEach((columnId) => {
      if (columnId !== "name" && columnId !== "num_participants") {
        row[columnId] = getValueFromPath(group.stats, columnId);
      }
    });

    return row;
  });
}

/**
 * Multi-select dropdown component for categorical filters.
 */
function MultiSelectDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const displayText =
    value.length === 0
      ? "Alla"
      : value.length === options.length
      ? "Alla valda"
      : value.length === 1
      ? value[0]
      : `${value.length} valda`;

  return (
    <div ref={dropdownRef} className="scout-multi-select-dropdown">
      <button
        type="button"
        className="scout-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="scout-dropdown-text">{displayText}</span>
        <span className="scout-dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="scout-dropdown-menu">
          {options.map((option) => (
            <label key={option} className="scout-dropdown-item">
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              className="scout-clear-button"
              onClick={() => onChange([])}
            >
              Rensa alla
            </button>
          )}
        </div>
      )}
    </div>
  );
}

MultiSelectDropdown.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Debounced input component for text and number filters.
 */
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 300,
  ...props
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

DebouncedInput.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  debounce: PropTypes.number,
};

/**
 * Filter component that renders the appropriate filter UI based on column meta.
 */
function Filter({ column, columnMeta }) {
  const columnFilterValue = column.getFilterValue();
  const { filterVariant } = column.columnDef.meta ?? {};
  const meta = columnMeta?.get(column.id);

  if (filterVariant === "range") {
    return (
      <div className="scout-filter-range">
        <DebouncedInput
          type="number"
          value={columnFilterValue?.[0] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old) => [value, old?.[1]])
          }
          placeholder="Min"
          className="scout-filter-input scout-filter-input-small"
        />
        <DebouncedInput
          type="number"
          value={columnFilterValue?.[1] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old) => [old?.[0], value])
          }
          placeholder="Max"
          className="scout-filter-input scout-filter-input-small"
        />
      </div>
    );
  }

  if (filterVariant === "select" && meta?.uniqueValues?.length) {
    return (
      <MultiSelectDropdown
        options={meta.uniqueValues}
        value={Array.isArray(columnFilterValue) ? columnFilterValue : []}
        onChange={(selected) =>
          column.setFilterValue(selected.length ? selected : undefined)
        }
      />
    );
  }

  // Default: text filter
  return (
    <DebouncedInput
      type="text"
      value={columnFilterValue ?? ""}
      onChange={(value) => column.setFilterValue(value)}
      placeholder="Sök..."
      className="scout-filter-input"
    />
  );
}

Filter.propTypes = {
  column: PropTypes.object.isRequired,
  columnMeta: PropTypes.instanceOf(Map),
};

/**
 * Custom filter function for range (min/max) filtering.
 */
function rangeFilterFn(row, columnId, filterValue) {
  const value = row.getValue(columnId);
  const [min, max] = filterValue ?? [];

  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const numValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numValue)) return false;

  if (min !== "" && min !== undefined && min !== null) {
    if (numValue < Number(min)) return false;
  }
  if (max !== "" && max !== undefined && max !== null) {
    if (numValue > Number(max)) return false;
  }
  return true;
}

/**
 * Custom filter function for multi-select filtering.
 */
function multiSelectFilterFn(row, columnId, filterValue) {
  if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
    return true;
  }

  const value = row.getValue(columnId);
  const strValue = value === null || value === undefined ? "" : String(value);

  if (!Array.isArray(filterValue)) {
    return strValue === filterValue;
  }

  return filterValue.includes(strValue);
}

/**
 * Resolves an ID to display text using the provided maps.
 */
function getDisplayName(id, sectionIdToText, questionIdToText) {
  return sectionIdToText?.[id] ?? questionIdToText?.[id] ?? id;
}

/**
 * Creates column definitions for TanStack Table.
 */
function createColumns(selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText) {
  const columns = [
    {
      accessorKey: "name",
      header: "Kår",
      meta: { filterVariant: "text" },
      size: 200,
      minSize: 150,
    },
    {
      accessorKey: "num_participants",
      header: "Deltagare",
      meta: { filterVariant: "range" },
      filterFn: rangeFilterFn,
      size: 100,
    },
  ];

  // Build a map of columnId to display name for headers (resolve IDs via display maps)
  const columnIdToName = new Map();
  hierarchy.forEach((category) => {
    category.children.forEach((child) => {
      if (child.type === "leaf") {
        const displayName = getDisplayName(child.name, sectionIdToText, questionIdToText);
        columnIdToName.set(child.columnId, displayName);
      } else if (child.type === "branch") {
        child.children.forEach((leaf) => {
          const displayName = getDisplayName(leaf.name, sectionIdToText, questionIdToText);
          columnIdToName.set(leaf.columnId, displayName);
        });
      }
    });
  });

  // Add dynamic columns for selected leaves
  selectedColumns.forEach((columnId) => {
    if (columnId === "name" || columnId === "num_participants") return;

    const headerName = columnIdToName.get(columnId) ?? getDisplayName(columnId.split(PATH_SEPARATOR).pop(), sectionIdToText, questionIdToText) ?? columnId;
    const meta = columnMeta.get(columnId);
    const isNumeric = meta?.type === "number";

    const colDef = {
      accessorKey: columnId,
      header: headerName,
      size: 120,
    };

    if (isNumeric) {
      colDef.meta = { filterVariant: "range" };
      colDef.filterFn = rangeFilterFn;
    } else if (meta?.uniqueValues?.length) {
      colDef.meta = { filterVariant: "select" };
      colDef.filterFn = multiSelectFilterFn;
    } else {
      colDef.meta = { filterVariant: "text" };
    }

    columns.push(colDef);
  });

  return columns;
}

export default function ScoutGroupTable({
  scoutGroups,
  selectedStatistics = [],
  statisticSubQuestions = {},
  selectedSubQuestions = {},
  sectionIdToText = {},
  questionIdToText = {},
}) {
  // Build hierarchy from all scout groups' stats
  const hierarchy = useMemo(
    () => buildStatsHierarchy(scoutGroups),
    [scoutGroups]
  );

  // Column IDs driven by chip selector (same selection as statistics view)
  const chipDrivenColumns = useMemo(
    () =>
      getColumnIdsFromChipSelection(
        hierarchy,
        selectedStatistics,
        selectedSubQuestions,
        statisticSubQuestions
      ),
    [
      hierarchy,
      selectedStatistics,
      selectedSubQuestions,
      statisticSubQuestions,
    ]
  );

  // Use chip-driven columns for the table (no dropdown override)
  const selectedColumns = chipDrivenColumns.size > 2 ? chipDrivenColumns : DEFAULT_VISIBLE_COLUMNS;

  // Column meta: type (number/string) and unique values for string columns
  const columnMeta = useMemo(
    () => getColumnMeta(scoutGroups, hierarchy),
    [scoutGroups, hierarchy]
  );

  // Transform data to rows based on selected columns
  const rows = useMemo(
    () => transformToRows(scoutGroups, selectedColumns),
    [scoutGroups, selectedColumns]
  );

  // Create TanStack column definitions
  const columns = useMemo(
    () => createColumns(selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText),
    [selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText]
  );

  // Column filters state
  const [columnFilters, setColumnFilters] = useState([]);

  // Sorting state
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);

  // Create the table instance
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          // border: '1px solid #e0e0e0',
          border: 1,
          borderColor: "grey.300",
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <SmartTable table={table} />
      </Box>
    </Box>
  );
}

ScoutGroupTable.propTypes = {
  scoutGroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      num_participants: PropTypes.number,
      stats: PropTypes.object,
    })
  ).isRequired,
  selectedStatistics: PropTypes.arrayOf(PropTypes.string),
  statisticSubQuestions: PropTypes.objectOf(
    PropTypes.arrayOf(PropTypes.string)
  ),
  selectedSubQuestions: PropTypes.object,
  sectionIdToText: PropTypes.objectOf(PropTypes.string),
  questionIdToText: PropTypes.objectOf(PropTypes.string),
};
