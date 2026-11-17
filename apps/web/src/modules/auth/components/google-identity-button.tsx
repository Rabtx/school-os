"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (options: {
						client_id: string;
						callback: (value: { credential: string }) => void;
					}) => void;
					renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
				};
			};
		};
	}
}

export function GoogleIdentityButton({
	onCredential,
	disabled = false,
}: {
	onCredential: (credential: string) => void;
	disabled?: boolean;
}) {
	const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
	const element = useRef<HTMLDivElement>(null);
	const [loaded, setLoaded] = useState(false);

	// Keep the latest callback without depending on it: `onCredential` changes on every parent
	// render (e.g. while typing), and re-initializing the Google button per keystroke would
	// tear the rendered button down and rebuild it each time.
	const onCredentialRef = useRef(onCredential);
	useEffect(() => {
		onCredentialRef.current = onCredential;
	}, [onCredential]);

	useEffect(() => {
		if (!loaded || !clientId || !element.current || !window.google) return;
		window.google.accounts.id.initialize({
			client_id: clientId,
			callback: ({ credential }) => onCredentialRef.current(credential),
		});
		element.current.replaceChildren();
		window.google.accounts.id.renderButton(element.current, {
			theme: "outline",
			size: "large",
			width: element.current.clientWidth,
			text: "continue_with",
			shape: "rectangular",
		});
	}, [clientId, loaded]);

	if (!clientId) return null;
	return (
		<div className={disabled ? "pointer-events-none opacity-50" : undefined}>
			<Script
				src="https://accounts.google.com/gsi/client"
				strategy="afterInteractive"
				onLoad={() => setLoaded(true)}
			/>
			<div ref={element} className="min-h-10 w-full" />
		</div>
	);
}
