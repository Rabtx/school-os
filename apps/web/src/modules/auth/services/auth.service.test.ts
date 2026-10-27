import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { authService } from "./auth.service";

describe("authService.refresh", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shares one in-flight request between concurrent callers", async () => {
		const pending: { settle?: (value: unknown) => void } = {};
		const post = vi.spyOn(apiClient, "post").mockImplementation(
			() =>
				new Promise((done) => {
					pending.settle = done;
				}) as never,
		);

		const first = authService.refresh();
		const second = authService.refresh();
		pending.settle?.({ accessToken: "token" });

		await expect(Promise.all([first, second])).resolves.toEqual([
			{ accessToken: "token" },
			{ accessToken: "token" },
		]);
		expect(post).toHaveBeenCalledTimes(1);
	});

	it("sends a new request once the previous one has settled", async () => {
		const post = vi.spyOn(apiClient, "post").mockResolvedValue({ accessToken: "token" } as never);

		await authService.refresh();
		await authService.refresh();

		expect(post).toHaveBeenCalledTimes(2);
	});
});
