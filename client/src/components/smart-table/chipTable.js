import { useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

/**
 * Helpers shared by `ScoutGroupTable` (per-group aggregated stats) and
 * `PeopleView` (per-person responses). Both views are driven by the same
 * chip selector state, so column IDs, metadata, definitions, filter func,
 * and the TanStack Table setup are all the same.
 *
 * The only data-dependent bit (building rows) is still done per-view.
 */

export const PATH_SEPARATOR = "§";

/** @param {...string} parts */
export const joinPath = (...parts) => parts.join(PATH_SEPARATOR);

/**
 * @typedef {{ type: "number" } | { type: "string", uniqueValues: string[] }} ColumnMeta
 */

/**
 * For each stat column, determines type (number vs string) and filter options
 * using the questions schema rather than scanning actual data values.
 *
 * Rules:
 * - 3-segment path (sectionId§questionId§choiceId): always numeric (choice counts)
 * - 2-segment path (sectionId§questionId):
 *   - type "number"             → number
 *   - type "boolean"            → number (count) unless `booleanAsChoice` is true,
 *                                 in which case a "Ja"/"Nej" choice filter
 *   - type "choice"             → string with filter options from questionChoices
 *   - type "text" / other / nil → string, no filter options
 *
 * @param {Set<string>} columnIds
 * @param {Record<string, string>} questionTypes
 * @param {Record<string, string[]>} questionChoices
 * @param {Record<string, string>} questionIdToText
 * @param {{ booleanAsChoice?: boolean }} [options]
 * @returns {Map<string, ColumnMeta>}
 */
export function getColumnMeta(
  columnIds,
  questionTypes,
  questionChoices,
  questionIdToText,
  options = {},
) {
  const booleanAsChoice = options.booleanAsChoice === true;

  /** @type {Map<string, ColumnMeta>} */
  const meta = new Map();

  for (const columnId of columnIds) {
    if (columnId === "name" || columnId === "num_participants") continue;

    const parts = columnId.split(PATH_SEPARATOR);

    if (parts.length === 3) {
      meta.set(columnId, { type: "number" });
      continue;
    }

    const qId = parts[1];
    const qType = questionTypes[qId];

    if (qType === "choice") {
      const uniqueValues = (questionChoices[qId] ?? [])
        .map((id) => questionIdToText[id] ?? id)
        .sort((a, b) => a.localeCompare(b, "sv"));
      meta.set(columnId, { type: "string", uniqueValues });
    } else if (qType === "boolean") {
      meta.set(
        columnId,
        booleanAsChoice
          ? { type: "string", uniqueValues: ["Ja", "Nej"] }
          : { type: "number" },
      );
    } else if (!qType || qType === "number") {
      meta.set(columnId, { type: "number" });
    } else {
      meta.set(columnId, { type: "string", uniqueValues: [] });
    }
  }

  return meta;
}

/**
 * Custom filter function for multi-select filtering.
 * @param {import('@tanstack/react-table').Row<any>} row
 * @param {string} columnId
 * @param {any} filterValue
 */
export function multiSelectFilterFn(row, columnId, filterValue) {
  if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
    return true;
  }
  const value = row.getValue(columnId);
  const strValue = value == null ? "" : String(value);
  return Array.isArray(filterValue) ? filterValue.includes(strValue) : strValue === filterValue;
}

/**
 * Creates column definitions for TanStack Table.
 *
 * @param {Set<string>} columnIds
 * @param {Map<string, ColumnMeta>} columnMeta
 * @param {Record<string, string>} questionIdToText
 * @param {{
 *   firstColumn: any,
 *   specialColumns?: Record<string, any>,
 * }} options
 */
export function createColumns(columnIds, columnMeta, questionIdToText, options) {
  const { firstColumn, specialColumns = {} } = options;
  /** @type {any[]} */
  const columns = [firstColumn];

  for (const columnId of columnIds) {
    if (columnId === "name") continue;
    if (specialColumns[columnId]) {
      columns.push(specialColumns[columnId]);
      continue;
    }

    const lastSegment = columnId.split(PATH_SEPARATOR).pop() ?? columnId;
    const colMeta = columnMeta.get(columnId);

    /** @type {any} */
    const colDef = {
      accessorKey: columnId,
      header: questionIdToText[lastSegment] ?? lastSegment,
      size: 200,
      ...(colMeta?.type === "number" && { sortingFn: "basic" }),
    };

    if (colMeta && "uniqueValues" in colMeta && colMeta.uniqueValues.length > 0) {
      colDef.meta = {
        dataType: {
          type: "choice",
          options: colMeta.uniqueValues.map((v) => ({ value: v, label: v })),
        },
      };
      colDef.filterFn = multiSelectFilterFn;
    }

    columns.push(colDef);
  }

  return columns;
}

/**
 * Wires up TanStack Table the way both chip-driven views want it: sortable,
 * filterable, paginated, with a stable "name" default sort and 25 rows/page.
 *
 * @template TRow
 * @param {TRow[]} rows
 * @param {any[]} columns
 */
export function useChipTable(rows, columns) {
  const [columnFilters, setColumnFilters] = useState(
    /** @type {import('@tanstack/react-table').ColumnFiltersState} */ ([]),
  );
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);

  return useReactTable({
    data: rows,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });
}
