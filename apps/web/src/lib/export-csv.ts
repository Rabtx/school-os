export type CsvColumn<T> = {
	header: string;
	value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
	const text = value === null || value === undefined ? "" : String(value);
	// Quote every cell and neutralise spreadsheet formulas (=, +, -, @ at the start).
	const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
	return `"${safe.replaceAll('"', '""')}"`;
}

/** Builds a CSV from rows and starts a browser download. */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
	const lines = [
		columns.map((column) => escapeCell(column.header)).join(","),
		...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(",")),
	];
	const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
