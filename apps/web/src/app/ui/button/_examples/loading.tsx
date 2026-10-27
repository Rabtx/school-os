"use client";

import { Button } from "@rabtx/ui/button";
import { useState } from "react";

export default function ButtonLoading() {
	const [loading, setLoading] = useState(false);

	return (
		<Button
			loading={loading}
			onClick={() => {
				setLoading(true);
				setTimeout(() => setLoading(false), 1800);
			}}
		>
			Save changes
		</Button>
	);
}
