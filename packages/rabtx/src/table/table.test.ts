import { describe, expect, it } from "vitest";
import { nextSort, pageSelection, sortRows, withIds } from "./table.logic";

describe("nextSort", () => {
	it("cycles ascending, descending, then off, and restarts on a new column", () => {
		const asc = nextSort(null, "name");
		expect(asc).toEqual({ id: "name", direction: "asc" });
		const desc = nextSort(asc, "name");
		expect(desc).toEqual({ id: "name", direction: "desc" });
		expect(nextSort(desc, "name")).toBeNull();
		expect(nextSort(desc, "date")).toEqual({ id: "date", direction: "asc" });
	});
});

describe("sortRows", () => {
	const rows = [
		{ n: "Zara", v: 3 },
		{ n: "ali", v: null },
		{ n: "Bilal", v: 10 },
	];

	it("compares numbers as numbers and keeps missing values last both ways", () => {
		const byValue = (row: (typeof rows)[number]) => row.v;
		expect(sortRows(rows, { id: "v", direction: "asc" }, byValue).map((r) => r.n)).toEqual([
			"Zara",
			"Bilal",
			"ali",
		]);
		expect(sortRows(rows, { id: "v", direction: "desc" }, byValue).map((r) => r.n)).toEqual([
			"Bilal",
			"Zara",
			"ali",
		]);
	});

	it("compares text by locale and leaves rows alone without a sort", () => {
		const byName = (row: (typeof rows)[number]) => row.n;
		expect(sortRows(rows, { id: "n", direction: "asc" }, byName).map((r) => r.n)).toEqual([
			"ali",
			"Bilal",
			"Zara",
		]);
		expect(sortRows(rows, null, byName)).toBe(rows);
	});
});

describe("selection", () => {
	it("reads all, mixed or none for the rows on screen", () => {
		expect(pageSelection(["a", "b"], new Set(["a", "b", "z"]))).toEqual({
			all: true,
			mixed: false,
			count: 2,
		});
		expect(pageSelection(["a", "b"], new Set(["a"]))).toEqual({
			all: false,
			mixed: true,
			count: 1,
		});
		expect(pageSelection([], new Set(["a"]))).toEqual({ all: false, mixed: false, count: 0 });
	});

	it("adds and removes ids without touching other pages", () => {
		const start = new Set(["x"]);
		expect([...withIds(start, ["a", "b"], true)].toSorted()).toEqual(["a", "b", "x"]);
		expect([...withIds(new Set(["a", "x"]), ["a"], false)]).toEqual(["x"]);
		expect([...start]).toEqual(["x"]);
	});
});
