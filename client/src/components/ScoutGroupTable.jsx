import { useMemo, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

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
 * Creates column definitions for TanStack Table.
 */
function createColumns(selectedColumns, hierarchy, columnMeta) {
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

  // Build a map of columnId to leaf name for headers
  const columnIdToName = new Map();
  hierarchy.forEach((category) => {
    category.children.forEach((child) => {
      if (child.type === "leaf") {
        columnIdToName.set(child.columnId, child.name);
      } else if (child.type === "branch") {
        child.children.forEach((leaf) => {
          columnIdToName.set(leaf.columnId, leaf.name);
        });
      }
    });
  });

  // Add dynamic columns for selected leaves
  selectedColumns.forEach((columnId) => {
    if (columnId === "name" || columnId === "num_participants") return;

    const headerName = columnIdToName.get(columnId) || columnId;
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

/**
 * Hierarchical column selector with accordion-style categories.
 */
function HierarchicalColumnSelector({
  hierarchy,
  selectedColumns,
  onSelectionChange,
}) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedBranches, setExpandedBranches] = useState(new Set());

  const handleCategoryAccordionChange = (categoryName) => (event, isExpanded) => {
    setExpandedCategory(isExpanded ? categoryName : null);
  };

  const toggleBranchExpanded = (branchName, event) => {
    event.stopPropagation();
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchName)) {
        next.delete(branchName);
      } else {
        next.add(branchName);
      }
      return next;
    });
  };

  const handleCategoryCheckbox = (category, event) => {
    event.stopPropagation();
    const allLeafIds = getAllLeafIds(category);
    const allSelected = allLeafIds.every((id) => selectedColumns.has(id));

    const newSelection = new Set(selectedColumns);
    if (allSelected) {
      // Deselect all
      allLeafIds.forEach((id) => newSelection.delete(id));
    } else {
      // Select all
      allLeafIds.forEach((id) => newSelection.add(id));
    }
    onSelectionChange(newSelection);
  };

  const handleBranchCheckbox = (branch, event) => {
    event.stopPropagation();
    const allLeafIds = getAllLeafIds(branch);
    const allSelected = allLeafIds.every((id) => selectedColumns.has(id));

    const newSelection = new Set(selectedColumns);
    if (allSelected) {
      allLeafIds.forEach((id) => newSelection.delete(id));
    } else {
      allLeafIds.forEach((id) => newSelection.add(id));
    }
    onSelectionChange(newSelection);
  };

  const handleLeafCheckbox = (columnId) => {
    const newSelection = new Set(selectedColumns);
    if (newSelection.has(columnId)) {
      newSelection.delete(columnId);
    } else {
      newSelection.add(columnId);
    }
    onSelectionChange(newSelection);
  };

  const getCategoryCheckState = (category) => {
    const allLeafIds = getAllLeafIds(category);
    const selectedCount = allLeafIds.filter((id) =>
      selectedColumns.has(id)
    ).length;
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === allLeafIds.length)
      return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const getBranchCheckState = (branch) => {
    const allLeafIds = getAllLeafIds(branch);
    const selectedCount = allLeafIds.filter((id) =>
      selectedColumns.has(id)
    ).length;
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === allLeafIds.length)
      return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  return (
    <Box sx={{ maxHeight: 400, overflow: "auto" }}>
      {/* Base columns */}
      <List dense disablePadding>
        <ListItem disablePadding>
          <ListItemButton disabled sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox checked disabled size="small" />
            </ListItemIcon>
            <ListItemText primary="Kår" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleLeafCheckbox("num_participants")}
            sx={{ py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox
                checked={selectedColumns.has("num_participants")}
                size="small"
              />
            </ListItemIcon>
            <ListItemText primary="Deltagare" />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Category accordions */}
      {hierarchy.map((category) => {
        const checkState = getCategoryCheckState(category);
        return (
          <Accordion
            key={category.name}
            expanded={expandedCategory === category.name}
            onChange={handleCategoryAccordionChange(category.name)}
            disableGutters
            sx={{
              "&:before": { display: "none" },
              boxShadow: "none",
              borderTop: "1px solid #e0e0e0",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0 } }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center" }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={checkState.checked}
                  indeterminate={checkState.indeterminate}
                  onChange={(e) => handleCategoryCheckbox(category, e)}
                  size="small"
                  sx={{ mr: 1 }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {category.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ py: 0, px: 1 }}>
              <List dense disablePadding>
                {category.children.map((child) => {
                  if (child.type === "leaf") {
                    return (
                      <ListItem key={child.columnId} disablePadding>
                        <ListItemButton
                          onClick={() => handleLeafCheckbox(child.columnId)}
                          sx={{ py: 0.25, pl: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              checked={selectedColumns.has(child.columnId)}
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={child.name}
                            slotProps={{ primary: { variant: "body2" } }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  } else if (child.type === "branch") {
                    const branchCheckState = getBranchCheckState(child);
                    const isBranchExpanded = expandedBranches.has(child.name);
                    return (
                      <Box key={child.name}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={(e) => toggleBranchExpanded(child.name, e)}
                            sx={{ py: 0.25, pl: 2 }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                checked={branchCheckState.checked}
                                indeterminate={branchCheckState.indeterminate}
                                onChange={(e) => handleBranchCheckbox(child, e)}
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={child.name}
                              slotProps={{
                                primary: { variant: "body2", fontWeight: 500 },
                              }}
                            />
                            <ExpandMoreIcon
                              sx={{
                                transform: isBranchExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s",
                                fontSize: 20,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                        {isBranchExpanded && (
                          <List dense disablePadding>
                            {child.children.map((leaf) => (
                              <ListItem key={leaf.columnId} disablePadding>
                                <ListItemButton
                                  onClick={() =>
                                    handleLeafCheckbox(leaf.columnId)
                                  }
                                  sx={{ py: 0.25, pl: 5 }}
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Checkbox
                                      checked={selectedColumns.has(
                                        leaf.columnId
                                      )}
                                      size="small"
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={leaf.name}
                                    slotProps={{ primary: { variant: "body2" } }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Box>
                    );
                  }
                  return null;
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

HierarchicalColumnSelector.propTypes = {
  hierarchy: PropTypes.array.isRequired,
  selectedColumns: PropTypes.instanceOf(Set).isRequired,
  onSelectionChange: PropTypes.func.isRequired,
};

export default function ScoutGroupTable({ scoutGroups }) {
  // Build hierarchy from all scout groups' stats
  const hierarchy = useMemo(
    () => buildStatsHierarchy(scoutGroups),
    [scoutGroups]
  );

  // Track selected column IDs (leaves)
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_VISIBLE_COLUMNS);

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
    () => createColumns(selectedColumns, hierarchy, columnMeta),
    [selectedColumns, hierarchy, columnMeta]
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
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Column selector */}
      <FormControl sx={{ minWidth: 200, maxWidth: 400, flexShrink: 0 }}>
        <InputLabel id="column-select-label">Visa kolumner</InputLabel>
        <Select
          labelId="column-select-label"
          id="column-select"
          multiple
          value={Array.from(selectedColumns)}
          input={<OutlinedInput label="Visa kolumner" />}
          renderValue={() => `${selectedColumns.size} kolumner valda`}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 500,
                width: 350,
              },
            },
          }}
        >
          <HierarchicalColumnSelector
            hierarchy={hierarchy}
            selectedColumns={selectedColumns}
            onSelectionChange={setSelectedColumns}
          />
        </Select>
      </FormControl>

      {/* Table container */}
      <div className="scout-table-container">
        <table className="scout-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder ? null : (
                      <>
                        <div
                          className={
                            header.column.getCanSort()
                              ? "scout-sortable-header"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: " ▲",
                            desc: " ▼",
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                        {header.column.getCanFilter() && (
                          <div className="scout-filter-container">
                            <Filter column={header.column} columnMeta={columnMeta} />
                          </div>
                        )}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="scout-pagination">
        <div className="scout-pagination-buttons">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {"<<"}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {">"}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {">>"}
          </button>
        </div>
        <span className="scout-pagination-info">
          Sida{" "}
          <strong>
            {table.getState().pagination.pageIndex + 1} av {table.getPageCount()}
          </strong>
        </span>
        <span className="scout-pagination-goto">
          | Gå till sida:
          <input
            type="number"
            min="1"
            max={table.getPageCount()}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="scout-pagination-input"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="scout-pagination-select"
        >
          {[10, 25, 50, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Visa {pageSize}
            </option>
          ))}
        </select>
        <span className="scout-pagination-total">
          {table.getPrePaginationRowModel().rows.length} rader totalt
        </span>
      </div>
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
};
