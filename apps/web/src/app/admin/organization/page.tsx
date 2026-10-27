import { redirect } from "next/navigation";

// Organization setup lives in settings now.
export default function OrganizationRedirectPage() {
	redirect("/admin/settings/general");
}
