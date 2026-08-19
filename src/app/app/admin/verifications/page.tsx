import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { can } from "@/lib/roles";
import { ReviewQueue } from "@/components/verification/ReviewQueue";

export const metadata: Metadata = { title: "Verifications — Givny admin" };

export default async function VerificationsPage() {
    // The admin layout already gated on holding *a* role; this narrows to the
    // capability, so a role without review rights can't reach the queue.
    const role = await getMyAdminRole();
    if (!can(role, "verifications.review")) redirect("/app/admin");

    return (
        <div className="space-y-3">
            <div>
                <p className="text-[13px] text-gray-500">
                    Check the name and photo match the account, then decide. The card image is
                    deleted either way — approving and rejecting both destroy it.
                </p>
            </div>
            <ReviewQueue />
        </div>
    );
}
