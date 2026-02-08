import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
import type { DataType } from "./meta";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		dataType?: DataType;
	}
}
