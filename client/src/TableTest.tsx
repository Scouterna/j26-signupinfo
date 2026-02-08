import { Paper } from "@mui/material";
import {
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { SmartTable } from "./components/smart-table/SmartTable";

type Attendee = {
	firstName: string;
	lastName: string;
	role: "scout" | "leader" | "volunteer";
	age: number;
};

const defaultData: Attendee[] = [
	{ firstName: "Alice", lastName: "Smith", role: "scout", age: 27 },
	{ firstName: "Bob", lastName: "Abraham", role: "leader", age: 35 },
	{ firstName: "Charlie", lastName: "Brown", role: "volunteer", age: 22 },
	{ firstName: "Diana", lastName: "Chen", role: "scout", age: 19 },
	{ firstName: "Erik", lastName: "Johansson", role: "leader", age: 42 },
	{ firstName: "Fiona", lastName: "Murphy", role: "volunteer", age: 28 },
	{ firstName: "Gustav", lastName: "Andersson", role: "scout", age: 21 },
	{ firstName: "Hannah", lastName: "Wilson", role: "leader", age: 38 },
	{ firstName: "Isaac", lastName: "Taylor", role: "scout", age: 24 },
	{ firstName: "Julia", lastName: "Martinez", role: "volunteer", age: 31 },
	{ firstName: "Kevin", lastName: "Larsson", role: "scout", age: 20 },
	{ firstName: "Laura", lastName: "Davies", role: "leader", age: 45 },
	{ firstName: "Marcus", lastName: "Berg", role: "volunteer", age: 26 },
	{ firstName: "Nina", lastName: "Olsson", role: "scout", age: 23 },
	{ firstName: "Oscar", lastName: "Peterson", role: "leader", age: 39 },
	{ firstName: "Paula", lastName: "Garcia", role: "volunteer", age: 29 },
	{ firstName: "Quinn", lastName: "Nilsson", role: "scout", age: 18 },
	{ firstName: "Rachel", lastName: "Kumar", role: "leader", age: 41 },
	{ firstName: "Simon", lastName: "Lindberg", role: "volunteer", age: 33 },
	{ firstName: "Tina", lastName: "Svensson", role: "scout", age: 25 },
];

const columnHelper = createColumnHelper<Attendee>();

const columns = [
	columnHelper.accessor("firstName", {
		header: () => "Förnamn",
		size: 200,
	}),
	columnHelper.accessor("lastName", {
		header: () => "Efternamn",
		size: 200,
	}),
	columnHelper.accessor("role", {
		header: () => "Roll",
		enableSorting: false,
		cell: (info) => {
			const role = info.getValue();
			return role.charAt(0).toUpperCase() + role.slice(1);
		},
		meta: {
			dataType: {
				type: "choice",
				options: [
					{
						value: 1,
						label: "Deltagare",
					},
					{
						value: 2,
						label: "Ledare",
					},
					{
						value: 3,
						label: "Funktionär",
					},
					{
						value: 4,
						label: "Planeringsfunktionär",
					},
				],
			},
		},
	}),
	columnHelper.accessor("age", {
		header: () => "Ålder",
		footer: () => "Total: 15",
		meta: {
			dataType: {
				type: "number",
			},
		},
	}),
];

export function TableTest() {
	const [data, _setData] = useState(() => [...defaultData]);

	const table = useReactTable({
		data,
		columns,
		columnResizeMode: "onChange",
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<>
			<Paper sx={{ height: "400px" }}>
				<SmartTable table={table} />
			</Paper>
			<pre>
				{JSON.stringify(
					{
						// columnSizing: table.getState().columnSizing,
						// columnSizeVars,
						sort: table.getState().sorting,
					},
					null,
					2,
				)}
			</pre>
		</>
	);
}
