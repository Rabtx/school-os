import { describe, expect, it } from "vitest";
import { reachLine, readRate } from "./notice-format";

describe("notice format", () => {
	it("reads a rate only once someone was reached", () => {
		expect(readRate({ readCount: 0, recipientCount: 0 })).toBeNull();
		expect(readRate({ readCount: 23, recipientCount: 25 })).toBe(92);
	});

	it("says who a draft reaches and who waits for WhatsApp", () => {
		expect(reachLine({ parents: 25, parentsOnApp: 3, staff: 0, total: 25 })).toBe(
			"25 people · 3 parents on School OS, 22 by WhatsApp once connected",
		);
		expect(reachLine({ parents: 0, parentsOnApp: 0, staff: 1, total: 1 })).toBe(
			"1 person · 1 staff",
		);
	});
});
