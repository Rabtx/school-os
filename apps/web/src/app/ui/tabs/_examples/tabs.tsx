import { TabNav } from "@rabtx/ui/tabs";

export default function TabsExample() {
	return (
		<TabNav
			label="Gradebook sections"
			className="w-full"
			items={[
				{ label: "Marks", href: "#marks", active: true },
				{ label: "Report cards", href: "#report-cards" },
				{ label: "Rubrics", href: "#rubrics" },
			]}
		/>
	);
}
