export type NavigationNode = {
	id: string;
	key: string;
	label: string;
	href: string | null;
	iconKey: string | null;
	/** School-wide total shown beside the item (leadership only). */
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
	/** Active-year classes for the sidebar; empty for roles without school-wide access. */
	classes: NavigationClass[];
};
