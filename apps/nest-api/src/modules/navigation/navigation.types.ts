export type NavigationNode = {
	id: string;
	key: string;
	label: string;
	href: string | null;
	iconKey: string | null;
	/** Badge count shown beside the item, when the viewer may see school-wide totals. */
	count?: number;
	children: NavigationNode[];
};

export type NavigationSection = {
	heading: string;
	items: NavigationNode[];
};

export type NavigationClass = {
	sectionId: string;
	campusId: string;
	label: string;
	studentCount: number;
};

export type NavigationResponse = {
	sections: NavigationSection[];
	/** Sidebar "Classes" list (active academic year); empty unless the viewer sees the whole school. */
	classes: NavigationClass[];
};
