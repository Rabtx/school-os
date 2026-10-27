export function PropsTable({
	rows,
}: {
	rows: [name: string, type: string, description: string][];
}) {
	return (
		<div className="overflow-x-auto rounded-xl border border-(--rx-border-strong)">
			<table className="w-full min-w-120 text-left text-[13px]">
				<tbody>
					{rows.map(([name, type, description]) => (
						<tr key={name} className="border-b border-(--rx-border) last:border-0">
							<th scope="row" className="px-4 py-2.5 align-top font-mono text-xs font-medium">
								{name}
							</th>
							<td className="px-4 py-2.5 align-top font-mono text-xs text-(--rx-text-secondary)">
								{type}
							</td>
							<td className="px-4 py-2.5 text-(--rx-text-secondary)">{description}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
