/**
 * Escapes a single CSV cell: wraps it in double quotes when it contains the
 * delimiter, a quote, or a newline, and doubles any embedded quotes.
 * @param {unknown} value
 */
function escapeCsvCell(value) {
	const str = value == null ? "" : String(value);
	if (/[";\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Triggers a browser download for the given blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.style.display = "none";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// UTF-8 byte-order mark (U+FEFF). Excel needs this to read å/ä/ö correctly.
const BOM = String.fromCharCode(0xfeff);

/**
 * Builds a CSV from a TanStack Table and triggers a browser download.
 *
 * Exports the currently visible columns and the filtered + sorted rows (all
 * pages, not just the visible page), so the file matches what the user sees.
 *
 * Uses a UTF-8 BOM and a semicolon delimiter so the file opens cleanly with a
 * double-click in Swedish Excel — where ";" is the default column separator and
 * the BOM makes Excel read å/ä/ö correctly.
 *
 * @param {import('@tanstack/react-table').Table<any>} table
 * @param {string} [filename]
 */
export function exportTableToCsv(table, filename = "tabell.csv") {
	const DELIMITER = ";";

	const columns = table.getVisibleLeafColumns();

	const headers = columns.map((col) => {
		const header = col.columnDef.header;
		return typeof header === "string" ? header : col.id;
	});

	const rows = table
		.getFilteredRowModel()
		.rows.map((row) => columns.map((col) => row.getValue(col.id)));

	const csv = [headers, ...rows]
		.map((cells) => cells.map(escapeCsvCell).join(DELIMITER))
		.join("\r\n");

	const blob = new Blob([BOM, csv], { type: "text/csv;charset=utf-8;" });

	triggerDownload(blob, filename);
}
