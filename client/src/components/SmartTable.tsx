import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import {
	Box,
	Divider,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableFooter,
	TableHead,
	TableRow,
	TableSortLabel,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import {
	flexRender,
	type Header,
	type Table as TanstackTable,
} from "@tanstack/react-table";
import {
	type ComponentProps,
	memo,
	type ReactNode,
	useMemo,
	useState,
} from "react";
import { MultiselectMenu } from "./MultiselectMenu";

export type Props<TData> = ComponentProps<typeof Paper> & {
	table: TanstackTable<TData>;
};

export function SmartTable<TData>(props: Props<TData>) {
	const { table, ...otherProps } = props;

	const [headerMenuAnchorEl, setHeaderMenuAnchorEl] =
		useState<null | HTMLElement>(null);
	const [headerMenuHeader, setHeaderMenuHeader] = useState<null | Header<
		TData,
		unknown
	>>(null);

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
			colSizes[`--header-${header.id}-size`] = header.getSize();
			colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
		}
		return colSizes;
	}, [table.getState().columnSizingInfo, table.getState().columnSizing]);

	return (
		<Paper {...otherProps}>
			<HeaderMenu
				anchor={headerMenuAnchorEl}
				header={headerMenuHeader}
				onClose={() => {
					setHeaderMenuAnchorEl(null);
					// By not clearing the header here, we avoid flicker in the menu
					// setHeaderMenuHeader(null);
				}}
			/>

			<TableContainer>
				<Table
					sx={{
						...columnSizeVars,
						width:
							(table.options.enableColumnResizing ?? true)
								? table.getTotalSize()
								: "100%",
					}}
				>
					<TableHead>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableCell
										key={header.id}
										sx={{
											position: "relative",
											width: `calc(var(--header-${header?.id}-size) * 1px)`,
										}}
										sortDirection={header.column.getIsSorted() || undefined}
									>
										<Box
											sx={{
												display: "flex",
												"&:hover": {
													"& .header-actions": {
														visibility: "visible",
													},
												},
											}}
										>
											<TableSortLabel
												active={!!header.column.getIsSorted()}
												direction={header.column.getIsSorted() || undefined}
												onClick={header.column.getToggleSortingHandler()}
												sx={{
													flex: 1,
												}}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												{header.column.getIsSorted() ? (
													<Box component="span" sx={visuallyHidden}>
														{header.column.getIsSorted() === "desc"
															? "sorted descending"
															: "sorted ascending"}
													</Box>
												) : null}
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

					{table.getState().columnSizingInfo.isResizingColumn ? (
						<MemoizedSmartTableBody table={table} />
					) : (
						<SmartTableBody table={table} />
					)}

					<TableFooter>
						{table.getFooterGroups().map((footerGroup) => (
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
						))}
					</TableFooter>
				</Table>
			</TableContainer>
		</Paper>
	);
}

function SmartTableBody<TData>({ table }: { table: TanstackTable<TData> }) {
	return (
		<TableBody>
			{table.getRowModel().rows.map((row) => (
				<TableRow key={row.id}>
					{row.getVisibleCells().map((cell) => (
						<TableCell key={cell.id}>
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
				transform:
					table.options.columnResizeMode === "onEnd" &&
					header.column.getIsResizing()
						? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
						: "",
			}}
		/>
	);
}

const options = [
	{ id: 0, label: "Grön" },
	{ id: 1, label: "Blå" },
	{ id: 2, label: "Röd" },
	{ id: 3, label: "Gul" },
	{ id: 4, label: "Svart" },
	{ id: 5, label: "Vit" },
	{ id: 6, label: "Orange" },
	{ id: 7, label: "Lila" },
	{ id: 8, label: "Rosa" },
	{ id: 9, label: "Brun" },
	{ id: 10, label: "Grå" },
	{ id: 11, label: "Cyan" },
	{ id: 12, label: "Magenta" },
	{ id: 13, label: "Lime" },
	{ id: 14, label: "Marinblå" },
	{ id: 15, label: "Olive" },
	{ id: 16, label: "Teal" },
	{ id: 17, label: "Silver" },
	{ id: 18, label: "Guld" },
	{ id: 19, label: "Korall" },
].sort((a, b) => a.label.localeCompare(b.label));

function HeaderMenu({
	anchor,
	header,
	onClose,
}: {
	anchor: HTMLElement | null;
	// biome-ignore lint/suspicious/noExplicitAny: We don't care about the type here
	header: Header<any, any> | null;
	onClose?: () => void;
}) {
	const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
		useState<HTMLElement | null>(null);

	const [selected, setSelected] = useState<number[]>([]);

	const open = Boolean(anchor) && Boolean(header);

	const menuSections: ReactNode[] = [];

	if (header) {
		if (header.column.getCanSort()) {
			menuSections.push(
				header.column.getCanSort() &&
					[
						header.column.getIsSorted() !== "asc" && (
							<MenuItem
								key="sortAsc"
								onClick={(e) => header.column.toggleSorting(false, e.shiftKey)}
							>
								<ListItemIcon>
									<ArrowUpwardIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Sortera stigande</ListItemText>
							</MenuItem>
						),
						header.column.getIsSorted() !== "desc" && (
							<MenuItem
								key="sortDesc"
								onClick={(e) => header.column.toggleSorting(true, e.shiftKey)}
							>
								<ListItemIcon>
									<ArrowDownwardIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Sortera fallande</ListItemText>
							</MenuItem>
						),
						header.column.getIsSorted() && (
							<MenuItem
								key="clearSort"
								onClick={() => header.column.clearSorting()}
							>
								<ListItemIcon>
									<ClearIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Rensa sortering</ListItemText>
							</MenuItem>
						),
					].filter(Boolean),
			);
		}

		if (header.column.getCanFilter()) {
			menuSections.push(
				<MenuItem
					key="filterMenu"
					onClick={(e) => {
						setFilterMenuAnchorEl(e.currentTarget);
					}}
				>
					<ListItemIcon>
						<FilterListIcon fontSize="small" />
					</ListItemIcon>
					<ListItemText>
						{header.column.getIsFiltered() ? "Ta bort filter" : "Filtrera"}
					</ListItemText>
					<ListItemIcon sx={{ marginLeft: "auto", minWidth: "0 !important" }}>
						<ChevronRightIcon fontSize="small" />
					</ListItemIcon>
				</MenuItem>,
			);
		}
	}

	return (
		<>
			<Menu
				// id="basic-menu"
				anchorEl={anchor}
				open={open}
				onClose={onClose}
				// slotProps={{
				// 	list: {
				// 		"aria-labelledby": "basic-button",
				// 	},
				// }}
			>
				{menuSections.map((section, index) => [
					section,
					index < menuSections.length - 1 && (
						// biome-ignore lint/suspicious/noArrayIndexKey: It's a somewhat stable list
						<Divider key={`divider-${index}`} />
					),
				])}
			</Menu>

			<MultiselectMenu
				options={options}
				anchorEl={filterMenuAnchorEl}
				open={!!filterMenuAnchorEl}
				onClose={() => {
					setFilterMenuAnchorEl(null);
				}}
				anchorOrigin={{
					horizontal: "right",
					vertical: "top",
				}}
				sx={{
					mt: -1,
				}}
				slotProps={{
					paper: {
						style: {
							minWidth: "12rem",
							maxHeight: "25rem",
						},
					},
					list: {
						"aria-labelledby": "long-button",
					},
				}}
				selected={selected}
				onChange={(newSelected) => {
					setSelected(newSelected);
				}}
			/>
		</>
	);
}

// Special memoized wrapper for our table body that we will use during column resizing
export const MemoizedSmartTableBody = memo(
	SmartTableBody,
	(prev, next) => prev.table.options.data === next.table.options.data,
) as typeof SmartTableBody;
