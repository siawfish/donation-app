import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { authConfig } from "@/firebase/config/server-config";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { RolesManager } from "@/components/admin/RolesManager";

export const metadata: Metadata = { title: "Admins — Givny admin" };

export default async function RolesPage() {
    const role = await getMyAdminRole();
    if (!can(role, "roles.manage")) redirect("/app/admin");

    const tokens = await getTokens(await cookies(), authConfig);

    return (
        <div className="space-y-4 pb-6">
            <div>
                <h2 className="text-xl font-bold text-ink tracking-tight">Admin access</h2>
                <p className="text-sm text-gray-500">
                    Only super admins can change this. The last super admin can&apos;t be removed.
                </p>
            </div>
            <RolesManager myUid={tokens?.decodedToken.uid ?? ""} />
        </div>
    );
}
