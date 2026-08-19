import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getFeatures } from "@/app/app/actions/settings";
import { can } from "@/lib/roles";
import { DeliverySettings } from "@/components/admin/DeliverySettings";

export const metadata = { title: "Settings — Admin" };

export default async function AdminSettingsPage() {
    // The layout gates admin access generally; this re-checks the specific
    // capability, since moderators can reach the section but not this page.
    const role = await getMyAdminRole();
    if (!can(role, "settings.manage")) redirect("/app/admin");

    const features = await getFeatures();

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-bold text-ink">Features</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Switch parts of the platform on and off without a deploy.
                </p>
            </div>
            <DeliverySettings initial={features} />
        </div>
    );
}
