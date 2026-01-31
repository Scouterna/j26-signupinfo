import {
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { SmartTable } from "./components/SmartTable";

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
	}),
	columnHelper.accessor("age", {
		header: () => "Ålder",
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
	});

	return (
		<>
			<SmartTable table={table} className="w-full" />
			<pre className="mb-4 min-h-48">
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
