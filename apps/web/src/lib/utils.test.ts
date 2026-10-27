import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("merges class names and resolves tailwind conflicts", () => {
		const isHidden = false;
		const result = cn("p-2 text-sm", "p-4", isHidden && "hidden", undefined, "font-medium");
		expect(result).toBe("text-sm p-4 font-medium");
	});
});
