import Constants from "expo-constants";
import { Platform } from "react-native";

interface ApiSuccess<T> {
	success: true;
	statusCode: number;
	data: T;
}

interface ApiFailure {
	success: false;
	statusCode: number;
	code?: string;
	message?: string;
	errors?: ReadonlyArray<{ path?: string; message?: string }>;
}

export class ApiError extends Error {
	constructor(
		message: string,
		readonly statusCode: number,
		readonly code?: string,
		readonly issues?: ApiFailure["errors"],
	) {
		super(message);
		this.name = "ApiError";
	}
}

const REQUEST_TIMEOUT_MS = 15_000;
const apiOrigin = resolveApiOrigin(process.env.EXPO_PUBLIC_NEST_API_URL ?? defaultApiOrigin());
const apiPrefix = "/api/v1";

export type ApiRequestOptions = RequestInit & { accessToken?: string };

export const apiClient = {
	get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
		return request<T>(path, { ...options, method: "GET" });
	},
	post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
		return request<T>(path, {
			...options,
			method: "POST",
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	},
	postForm<T>(path: string, body: FormData, options?: ApiRequestOptions): Promise<T> {
		return request<T>(path, { ...options, method: "POST", body }, { multipart: true });
	},
	patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
		return request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
	},
	delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
		return request<T>(path, { ...options, method: "DELETE" });
	},
};

export function getApiOrigin(): string {
	return apiOrigin;
}

async function request<T>(
	path: string,
	options: ApiRequestOptions = {},
	flags: { multipart?: boolean } = {},
): Promise<T> {
	const { accessToken, signal: outerSignal, ...init } = options;
	const headers = new Headers(init.headers);
	if (init.body && !flags.multipart) headers.set("Content-Type", "application/json");
	if (init.method && init.method !== "GET") {
		headers.set("X-Requested-With", "XMLHttpRequest");
	}
	headers.set("X-Client-Platform", "native");
	if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

	const url = `${apiOrigin}${apiPrefix}${normalizePath(path)}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const onOuterAbort = () => controller.abort();
	outerSignal?.addEventListener("abort", onOuterAbort);

	try {
		const response = await fetch(url, {
			...init,
			headers,
			signal: controller.signal,
		});
		if (response.status === 204) return undefined as T;

		const payload: unknown = await response.json().catch(() => ({}));
		if (!response.ok) {
			const failure = payload as ApiFailure;
			throw new ApiError(
				typeof failure.message === "string"
					? failure.message
					: response.statusText || "Request failed",
				response.status,
				failure.code,
				failure.errors,
			);
		}
		return isSuccess<T>(payload) ? payload.data : (payload as T);
	} catch (caught) {
		if (caught instanceof ApiError) throw caught;
		if (isAbortError(caught)) {
			throw new ApiError(
				`Request timed out reaching ${apiOrigin}. Is Nest running and EXPO_PUBLIC_NEST_API_URL correct for this device?`,
				408,
				"API_TIMEOUT",
			);
		}
		throw new ApiError(
			`Cannot reach API at ${apiOrigin}. Use your computer LAN IP on a physical phone (not localhost).`,
			0,
			"API_UNREACHABLE",
		);
	} finally {
		clearTimeout(timeout);
		outerSignal?.removeEventListener("abort", onOuterAbort);
	}
}

/**
 * Prefer Metro's host so Expo Go on a real phone hits the same machine as the bundler.
 * Android emulator → 10.0.2.2; iOS simulator → localhost.
 *
 * Dev-only: production builds have no safe default origin (plaintext would carry
 * passwords and tokens), so they must set EXPO_PUBLIC_NEST_API_URL explicitly.
 */
function defaultApiOrigin(): string {
	if (!__DEV__) {
		throw new Error("EXPO_PUBLIC_NEST_API_URL is required in production builds");
	}
	const metroHost = getExpoMetroHost();
	if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
		return `http://${metroHost}:4000`;
	}
	if (Platform.OS === "android") return "http://10.0.2.2:4000";
	return "http://localhost:4000";
}

function getExpoMetroHost(): string | null {
	const hostUri =
		Constants.expoConfig?.hostUri ??
		Constants.manifest2?.extra?.expoGo?.debuggerHost ??
		(Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

	if (typeof hostUri !== "string" || hostUri.length === 0) return null;
	const host = hostUri.split(":")[0]?.trim();
	return host || null;
}

/**
 * Passwords, bearer tokens, and refresh tokens travel to this origin, so
 * plaintext http is allowed only in development builds (Metro host / emulator).
 */
function resolveApiOrigin(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`Invalid EXPO_PUBLIC_NEST_API_URL: ${value}`);
	}
	if (url.protocol === "http:") {
		if (!__DEV__) {
			throw new Error(`EXPO_PUBLIC_NEST_API_URL must use https in production builds: ${value}`);
		}
	} else if (url.protocol !== "https:") {
		throw new Error(`Invalid EXPO_PUBLIC_NEST_API_URL (expected an http(s) origin): ${value}`);
	}
	return url.origin;
}

function normalizePath(path: string): string {
	return path.startsWith("/") ? path : `/${path}`;
}

function isAbortError(error: unknown): boolean {
	return (
		(error instanceof Error && error.name === "AbortError") ||
		(typeof DOMException !== "undefined" &&
			error instanceof DOMException &&
			error.name === "AbortError")
	);
}

function isSuccess<T>(payload: unknown): payload is ApiSuccess<T> {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"success" in payload &&
		payload.success === true &&
		"data" in payload
	);
}
