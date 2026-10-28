"use client";

import { type SegmentOption, SegmentedControl } from "@rabtx/ui/segmented";
import { useState } from "react";

type Mark = "present" | "late" | "absent" | "excused";

const options: SegmentOption<Mark>[] = [
	{ value: "present", label: "Present" },
	{ value: "late", label: "Late", tone: "warning" },
	{ value: "absent", label: "Absent", tone: "danger" },
	{ value: "excused", label: "Excused", tone: "accent" },
];

export default function SegmentedAttendance() {
	const [mark, setMark] = useState<Mark | null>("present");
	return (
		<SegmentedControl
			label="Attendance for Ali Hassan"
			options={options}
			value={mark}
			onChange={setMark}
		/>
	);
}
