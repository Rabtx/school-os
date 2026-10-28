import type { GradebookTerm } from "../types/gradebook.types";

export const gradebookQueryKeys = {
	all: (tenantId: string) => ["gradebook", tenantId] as const,
	grid: (tenantId: string, sectionId: string, term: GradebookTerm, subjectId?: string) =>
		["gradebook", tenantId, "grid", sectionId, term, subjectId ?? "all"] as const,
	marks: (tenantId: string, sectionId: string, subjectId: string) =>
		["gradebook", tenantId, "marks", sectionId, subjectId] as const,
	studentReport: (tenantId: string, studentId: string, term?: GradebookTerm) =>
		["gradebook", tenantId, "report", studentId, term ?? "all"] as const,
};
