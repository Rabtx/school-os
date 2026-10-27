import { redirect } from "next/navigation";

// Members moved into settings (Figma "Settings · Members & roles").
export default function AdminMembersPage() {
	redirect("/admin/settings/members");
}
