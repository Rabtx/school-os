"use client";

import { FilterPillSelect } from "@rabtx/ui/filter-pill";
import { useState } from "react";

const classes = [
	{ label: "Grade 1-A", value: "1a" },
	{ label: "Grade 1-B", value: "1b" },
	{ label: "Grade 2-A", value: "2a" },
];

export default function FilterPillNative() {
	const [value, setValue] = useState("");
	return (
		<FilterPillSelect
			label="Class"
			placeholder="All"
			value={value}
			onValueChange={setValue}
			options={classes}
		/>
	);
}
