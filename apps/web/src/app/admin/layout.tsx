import { RequireAuth } from "@/modules/auth/components";
import { DashboardI18nShell } from "@/modules/dashboard";
import { PendingInvitesBanner } from "@/modules/members";
import { RoleCampusScope, TenantOnboardingGate } from "@/modules/tenants";
import { OfflineBanner } from "@/components/states";
import { AdminScrollLock } from "./_components/admin-scroll-lock";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminTopbar } from "./_components/admin-topbar";
import { CommandSearchProvider } from "./_components/command-search/command-search";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<RequireAuth>
			<TenantOnboardingGate>
				<RoleCampusScope />
				<AdminScrollLock />
				<CommandSearchProvider>
					<DashboardI18nShell className="flex h-dvh max-h-dvh overflow-hidden bg-dashboard-bg text-dashboard-text-primary">
						<AdminSidebar className="hidden lg:flex" />
						<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
							<AdminTopbar />
							<OfflineBanner />
							<PendingInvitesBanner />
							<main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
								{children}
							</main>
						</div>
					</DashboardI18nShell>
				</CommandSearchProvider>
			</TenantOnboardingGate>
		</RequireAuth>
	);
};

export default AdminLayout;
