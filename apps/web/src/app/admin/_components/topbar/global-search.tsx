"use client";

import { SearchInput } from "@school-os/ui/components/search-input";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
	placeholder?: string;
	className?: string;
};

export function GlobalSearch({ placeholder = "Search students", className }: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<SearchInput
			inputRef={inputRef}
			placeholder={placeholder}
			className={cn("h-7 w-full rounded-md", className)}
		/>
	);
}
