"use client";

import { Checkbox } from "@rabtx/ui/checkbox";
import { useState } from "react";

const teams = ["Design", "Engineering", "Growth"];

export default function CheckboxMixed() {
	const [picked, setPicked] = useState(["Design"]);
	const all = picked.length === teams.length;

	return (
		<div className="grid gap-3">
			<Checkbox
				checked={all}
				mixed={!all && picked.length > 0}
				onChange={() => setPicked(all ? [] : teams)}
			>
				All teams
			</Checkbox>
			<div className="grid gap-3 pl-6">
				{teams.map((team) => (
					<Checkbox
						key={team}
						checked={picked.includes(team)}
						onChange={() =>
							setPicked((now) =>
								now.includes(team) ? now.filter((t) => t !== team) : [...now, team],
							)
						}
					>
						{team}
					</Checkbox>
				))}
			</div>
		</div>
	);
}
