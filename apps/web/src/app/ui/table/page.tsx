import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import TableSortable from "./_examples/sortable";

export default function TablePage() {
	return (
		<Doc>
			<h1>Data table</h1>
			<p>
				A list table with sortable headers, row selection, a loading skeleton and an empty state.
			</p>
			<Example file="table/_examples/sortable.tsx">
				<TableSortable />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { DataTable, useClientTable } from "@rabtx/ui/table";\n\nconst table = useClientTable({ data, searchQuery, searchFn, sortFn });\n<DataTable columns={columns} rows={table.rows} getRowId={(row) => row.id} sort={table.sort} onSort={table.toggleSort} />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"columns",
						"DataTableColumn<T>[]",
						"id, header, renderCell, and optional sortable, sortValue, className, headerClassName.",
					],
					["rows / getRowId", "T[] / (row) => string", "The rows on screen."],
					[
						"sort / onSort",
						"SortState / (id) => void",
						"Header clicks cycle ascending, descending, then off.",
					],
					[
						"selection",
						"{ selectedIds; onChange; label }",
						"Row checkboxes; the header box covers the rows on screen.",
					],
					[
						"loading",
						"boolean",
						"Five skeleton rows, hidden from screen readers, with aria-busy on the body.",
					],
					["emptyState", "ReactNode", "Shown when there are no rows, such as a no-results state."],
					["fullBleed", "boolean", "Edge to edge with a sticky header, for the list layout."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Sorted columns carry aria-sort, and the sort control is a real button inside the header
					cell.
				</li>
				<li>Each row checkbox is named after its row (Select Ali Hassan).</li>
				<li>
					Header cells start-align from the base layer, so a column&apos;s text-right always wins.
				</li>
			</ul>
		</Doc>
	);
}
