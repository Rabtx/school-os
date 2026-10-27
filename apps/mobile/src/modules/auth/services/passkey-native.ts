/**
 * Lazy-load react-native-passkeys so Expo Go can still open auth screens.
 * The native module only exists in a custom dev/prod build.
 */
export async function assertPasskeysAvailable(): Promise<typeof import("react-native-passkeys")> {
	let Passkey: typeof import("react-native-passkeys");
	try {
		Passkey = await import("react-native-passkeys");
	} catch {
		throw missingNativeModuleError();
	}

	try {
		if (!Passkey.isSupported()) {
			throw new Error(
				"Passkeys are not available on this device. Use password or magic-link sign-in instead.",
			);
		}
	} catch (caught) {
		if (caught instanceof Error && caught.message.startsWith("Passkeys are not available")) {
			throw caught;
		}
		throw missingNativeModuleError();
	}

	return Passkey;
}

function missingNativeModuleError(): Error {
	return new Error(
		"Passkeys need a development build (Expo Go cannot load ReactNativePasskeys). Run: bun --cwd=apps/mobile run android",
	);
}
