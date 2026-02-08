import {
	Box,
	Checkbox,
	Divider,
	ListItemIcon,
	ListItemText,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import Fuse from "fuse.js";

import { useEffect, useMemo, useRef, useState } from "react";

export type Props<T> = {
	open: boolean;
	options: {
		value: T;
		label: string;
	}[];
	selected: T[];
	onSelected: (selected: T[]) => void;
};

export function ChoiceFilter<T extends string | number>({
	open,
	options,
	selected,
	onSelected,
}: Props<T>) {
	const fuse = useMemo(() => {
		return new Fuse(options, {
			keys: ["label"],
			threshold: 0.3,
		});
	}, [options]);

	const [filteredOptions, setFilteredOptions] = useState(options);

	const inputEl = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			setFilteredOptions(options);
		}
	}, [open, options]);

	useEffect(() => {
		if (open) {
			setTimeout(() => {
				inputEl.current?.querySelector("input")?.focus();
			}, 50);
		}
	}, [open]);

	const handleSearch = (query: string) => {
		if (query.trim() === "") {
			setFilteredOptions(options);
			return;
		}

		const res = fuse.search(query);
		setFilteredOptions(res.map((r) => r.item));
	};

	const allSelected = selected.length === options.length;
	const someSelected = selected.length > 0 && !allSelected;

	return (
		<>
			<Box
				sx={{
					position: "sticky",
					top: 0,
					backgroundColor: "background.paper",
					zIndex: 1,
					pt: 1,
					mt: -1,
				}}
			>
				<Box
					sx={{
						p: 1,
					}}
				>
					<TextField
						ref={inputEl}
						size="small"
						placeholder="Sök"
						onKeyDown={(e) => e.stopPropagation()}
						onChange={(e) => handleSearch(e.target.value)}
						onFocus={(e) => e.target.select()}
					/>
				</Box>

				{filteredOptions.length === options.length && (
					<MenuItem
						onClick={() => {
							if (allSelected) {
								onSelected([]);
							} else {
								onSelected(options.map((option) => option.value));
							}
						}}
					>
						<ListItemIcon>
							<Checkbox
								sx={{ pointerEvents: "none", p: 0 }}
								checked={allSelected}
								indeterminate={someSelected}
								value="" // Needed to make it a controlled checkbox
							/>
						</ListItemIcon>
						<ListItemText>
							{allSelected ? "Avmarkera alla" : "Markera alla"}
						</ListItemText>
					</MenuItem>
				)}

				<Divider sx={{ mb: 1 }} />
			</Box>

			{filteredOptions.length === 0 && (
				<Box sx={{ px: 2, py: 1 }}>
					<Typography variant="body2" color="text.secondary">
						Inga träffar
					</Typography>
				</Box>
			)}

			{filteredOptions.map((option) => {
				const isSelected = selected.includes(option.value);
				return (
					<MenuItem
						key={option.value}
						onClick={() => {
							if (isSelected) {
								onSelected(selected.filter((item) => item !== option.value));
							} else {
								onSelected([...selected, option.value]);
							}
						}}
					>
						<ListItemIcon>
							<Checkbox
								sx={{ pointerEvents: "none", p: 0 }}
								checked={isSelected}
								value="" // Needed to make it a controlled checkbox
							/>
						</ListItemIcon>
						<ListItemText>{option.label}</ListItemText>
					</MenuItem>
				);
			})}
		</>
	);
}
