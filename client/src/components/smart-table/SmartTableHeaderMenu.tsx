import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
	Box,
	Divider,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Typography,
} from "@mui/material";
import type { Header, RowData } from "@tanstack/react-table";
import { type ReactNode, useState } from "react";
import { ChoiceFilter } from "./filter/ChoiceFilter";

export function SmartTableHeaderMenu<TData extends RowData>({
	anchor,
	header,
	onClose,
}: {
	anchor: HTMLElement | null;
	header: Header<TData, unknown> | null;
	onClose?: () => void;
}) {
	const { dataType } = header?.column.columnDef.meta ?? {};

	const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
		useState<HTMLElement | null>(null);

	const [selected, setSelected] = useState<(string | number)[]>([]);

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
						console.log("Setting to", e.currentTarget);
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

			<Menu
				open={!!filterMenuAnchorEl}
				anchorEl={filterMenuAnchorEl}
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
				}}
				onClose={() => {
					console.log("Removing it");
					setFilterMenuAnchorEl(null);
				}}
			>
				{dataType?.type === "choice" ? (
					<ChoiceFilter
						open={!!filterMenuAnchorEl}
						options={dataType.options}
						selected={selected}
						onSelected={setSelected}
					/>
				) : (
					<Box sx={{ px: 2, py: 0.75 }}>
						<Typography>
							Just nu går det bara att filtrera på flervalsfrågor
						</Typography>
					</Box>
				)}
			</Menu>
		</>
	);
}
