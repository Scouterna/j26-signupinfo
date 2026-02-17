import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import {
	Box,
	IconButton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableFooter,
	TableHead,
	TablePagination,
	TableRow,
	TableSortLabel,
	Tooltip,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import {
	flexRender,
	type Header,
	type RowData,
	type Table as TanstackTable,
} from "@tanstack/react-table";
import { memo, useMemo, useState } from "react";
import { SmartTableHeaderMenu } from "./SmartTableHeaderMenu";

export type Props<TData> = {
	table: TanstackTable<TData>;
};

/**
 * Slugifies a string to be used in CSS variable names.
 */
function slugify(str: string) {
	return str
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
}


export function SmartTable<TData extends RowData>({ table }: Props<TData>) {
	const [headerMenuAnchorEl, setHeaderMenuAnchorEl] =
		useState<null | HTMLElement>(null);
	const [headerMenuHeader, setHeaderMenuHeader] = useState<null | Header<
		TData,
		unknown
	>>(null);

	const state = table.getState();

	const isResizing = state.columnSizingInfo.isResizingColumn !== false

	/**
	 * Instead of calling `column.getSize()` on every render for every header
	 * and especially every data cell (very expensive),
	 * we will calculate all column sizes at once at the root table level in a useMemo
	 * and pass the column sizes down as CSS variables to the <table> element.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: This is carefully optimized to avoid unnecessary recalculations
	const columnSizeVars = useMemo(() => {
		const headers = table.getFlatHeaders();
		const colSizes: { [key: string]: number } = {};
		for (const header of headers) {
			colSizes[`--header-${slugify(header.id)}-size`] = header.getSize();
			colSizes[`--col-${slugify(header.column.id)}-size`] = header.column.getSize();
		}
		return colSizes;
	}, [state.columnSizingInfo, state.columnSizing]);

	return (
		<Box
			sx={{
				display: "flex",
				boxSizing: "border-box",
				flexDirection: "column",
				position: "relative",
				pb: "52px",
				width: "100%",
				height: "100%",
			}}
		>
			<SmartTableHeaderMenu
				anchor={headerMenuAnchorEl}
				header={headerMenuHeader}
				onClose={() => {
					setHeaderMenuAnchorEl(null);
					// By not clearing the header here, we avoid flicker in the menu
					// setHeaderMenuHeader(null);
				}}
			/>

			<TableContainer
				sx={{
					flex: 1,
				}}
			>
				<Table
					style={{
						...columnSizeVars,
					}}
					sx={{
						tableLayout: "fixed",
						width:
							(table.options.enableColumnResizing ?? true)
								? table.getTotalSize()
								: "100%",
					}}
					stickyHeader
				>
					<TableHead>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableCell
										key={header.id}
										style={{
											width: `calc(var(--header-${slugify(header?.id)}-size) * 1px)`,
											backgroundColor: isResizing ? 'transparent' : undefined
										}}
										sortDirection={header.column.getIsSorted() || undefined}
									>
										<Box
											sx={{
												display: "flex",
												"&:hover": {
													"& .header-actions": !isResizing ? {
														visibility: "visible",
													} : {},
												},
											}}
										>
											<TableSortLabel
												disabled={isResizing}
												active={!!header.column.getIsSorted()}
												direction={header.column.getIsSorted() || undefined}
												onClick={header.column.getToggleSortingHandler()}
												sx={{
													flex: 1,
													display: "flex",
													minWidth: 0,
													"svg": {
														display: header.column.getIsSorted() ? "inline" : "none",
													},
													'&:hover': {
														"svg": {
															display: "inline",
														},
													},
												}}
											>
												<Tooltip
													title={
														flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)
													}
												>
													<Box
														sx={{
															flex: 1,
															whiteSpace: "nowrap",
															overflow: "hidden",
															textOverflow: "ellipsis",
														}}
													>
														{flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
													</Box>
												</Tooltip>

												{header.column.getIsSorted() && (
													<Box component="span" sx={visuallyHidden}>
														{header.column.getIsSorted() === "desc"
															? "sorted descending"
															: "sorted ascending"}
													</Box>
												)}
											</TableSortLabel>

											<IconButton
												className="header-actions"
												sx={{
													visibility: "hidden",
												}}
												onClick={(e) => {
													setHeaderMenuAnchorEl(e.currentTarget);
													setHeaderMenuHeader(header);
												}}
												size="small"
											>
												<MoreHorizIcon />
											</IconButton>
										</Box>

										{header.column.getCanResize() && (
											<ResizeHandle table={table} header={header} />
										)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableHead>

					{state.columnSizingInfo.isResizingColumn ? (
						<MemoizedSmartTableBody table={table} />
					) : (
						<SmartTableBody table={table} />
					)}

					<TableFooter>
						{/* {table.getFooterGroups().map((footerGroup) => (
							<TableRow key={footerGroup.id}>
								{footerGroup.headers.map((header) => (
									<TableCell key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.footer,
													header.getContext(),
												)}
									</TableCell>
								))}
							</TableRow>
						))} */}
					</TableFooter>
				</Table>
			</TableContainer>

			<TablePagination
				sx={{
					borderTop: "1px solid rgba(224, 224, 224, 1)",
					position: "absolute",
					width: "100%",
					bottom: 0,
					left: 0,
				}}
				component="div"
				rowsPerPageOptions={[5, 10, 25, 50, 100]}
				count={table.getRowCount()}
				rowsPerPage={state.pagination.pageSize}
				page={state.pagination.pageIndex}
				onPageChange={(_, index) => {
					table.setPageIndex(index);
				}}
				onRowsPerPageChange={(e) => {
					table.setPageSize(Number(e.target.value));
				}}
			/>
		</Box>
	);
}

function SmartTableBody<TData>({ table }: { table: TanstackTable<TData> }) {
	return (
		<TableBody>
			{table.getRowModel().rows.map((row) => (
				<TableRow key={row.id}>
					{row.getVisibleCells().map((cell) => (
						<TableCell key={cell.id}
							style={{
								width: `calc(var(--col-${slugify(cell.column.id)}-size) * 1px)`,
							}}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	);
}

function ResizeHandle({
	table,
	header,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: We don't care about the type here
	table: TanstackTable<any>;
	// biome-ignore lint/suspicious/noExplicitAny: We don't care about the type here
	header: Header<any, any>;
}) {
	return (
		<Box
			// FIXME: Hiding this from screen readers is not ideal.
			// Resizing columns might not be important for fully sight
			// impaired users, but it could be for low vision users.
			// https://github.com/Scouterna/ui/issues/15
			aria-hidden
			onDoubleClick={() => header.column.resetSize()}
			onMouseDown={header.getResizeHandler()}
			onTouchStart={header.getResizeHandler()}
			// className={cn(
			// 	"absolute flex justify-center items-center py-2 top-0 right-0 h-full w-2 cursor-col-resize touch-none select-none",
			// 	"after:w-0.5 after:h-full after:bg-gray-300",
			// 	header.column.getIsResizing() && "bg-blue-100 after:invisible",
			// )}
			sx={{
				position: "absolute",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				py: 2.5,
				top: 0,
				bottom: 0,
				right: 0,
				width: 8,
				cursor: "col-resize",
				touchAction: "none",
				userSelect: "none",
				backgroundColor: header.column.getIsResizing()
					? (theme) => theme.palette.action.selected
					: "transparent",
				"&::after": {
					content: '""',
					display: "block",
					width: "1px",
					height: "100%",
					backgroundColor: "grey.300",
				},
			}}
			style={{
				transform:
					table.options.columnResizeMode === "onEnd" &&
						header.column.getIsResizing()
						? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
						: "",
			}}
		/>
	);
}

// Special memoized wrapper for our table body that we will use during column resizing
export const MemoizedSmartTableBody = memo(
	SmartTableBody,
	(prev, next) => prev.table.options.data === next.table.options.data,
) as typeof SmartTableBody;
