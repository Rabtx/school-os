export { AdminDashboard } from "./components/admin-dashboard";
export { AdminHomePage } from "./components/admin-home-page";
export { StudentDashboard } from "./components/student-dashboard";
export { TeacherHome } from "./components/teacher-home/teacher-home";
export { useDashboardMetricsQuery } from "./hooks/use-dashboard-queries";
export { DashboardForwardIcon } from "./i18n/dashboard-directional-icon";
export { useDashboardI18n, useDashboardT } from "./i18n/dashboard-i18n-provider";
export { DashboardI18nShell } from "./i18n/dashboard-i18n-shell";
export { DashboardLocaleSwitcher } from "./i18n/dashboard-locale-switcher";
export type {
	AdmissionSource,
	AdmissionStatus,
	DashboardAdmission,
	DashboardGradeRow,
	DashboardMetrics,
	DashboardMonthEnrollment,
	DashboardOpsPulseItem,
	DashboardStatCard,
	DashboardTrend,
} from "./types/dashboard.types";
