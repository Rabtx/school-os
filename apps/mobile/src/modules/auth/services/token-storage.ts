import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "school-os.auth.refreshToken";

async function setRefreshTokenValue(value: string | null): Promise<void> {
	if (value === null) {
		await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
		return;
	}
	await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value);
}

async function getRefreshTokenValue(): Promise<string | null> {
	return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export const tokenStorage = {
	getRefreshToken: () => getRefreshTokenValue(),
	setRefreshToken: (token: string | null) => setRefreshTokenValue(token),
};
