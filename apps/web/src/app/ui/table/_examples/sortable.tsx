"use client";

import { DataTable, type DataTableColumn, sortRows, useClientTable } from "@rabtx/ui/table";
import { useState } from "react";

type Student = { id: string; name: string; className: string; attendance: number };

const students: Student[] = [
	{ id: "1", name: "Ali Hassan", className: "7-B", attendance: 96 },
	{ id: "2", name: "Ayesha Khan", className: "7-B", attendance: 88 },
	{ id: "3", name: "Hamza Raza", className: "8-A", attendance: 74 },
	{ id: "4", name: "Fatima Noor", className: "8-A", attendance: 99 },
];

const columns: DataTableColumn<Student>[] = [
	{
		id: "name",
		header: "Student",
		sortable: true,
		sortValue: (row) => row.name,
		renderCell: (row) => row.name,
	},
	{ id: "class", header: "Class", renderCell: (row) => row.className },
	{
		id: "attendance",
		header: "Attendance",
		headerClassName: "text-right",
		className: "text-right tabular-nums",
		sortable: true,
		sortValue: (row) => row.attendance,
		renderCell: (row) => `${row.attendance}%`,
	},
];

export default function TableSortable() {
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const table = useClientTable({
		data: students,
		sortFn: (rows, sort) => sortRows(rows, sort, columns.find((c) => c.id === sort?.id)?.sortValue),
	});
	return (
		<DataTable
			className="w-full"
			columns={columns}
			rows={table.rows}
			getRowId={(row) => row.id}
			sort={table.sort}
			onSort={table.toggleSort}
			selection={{ selectedIds: selected, onChange: setSelected, label: (row) => row.name }}
		/>
	);
}
