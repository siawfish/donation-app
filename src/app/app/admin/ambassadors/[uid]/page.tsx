import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMyAdminRole } from "@/app/app/actions/admin";
import { getAmbassador } from "@/app/app/actions/ambassadors";
import { can } from "@/lib/roles";
import { AmbassadorDetailView } from "@/components/admin/ambassadors/AmbassadorDetailView";

export const metadata = { title: "Ambassador — Admin" };

export default async function AmbassadorDetailPage({ params }: { params: { uid: string } }) {
    const role = await getMyAdminRole();
    if (!can(role, "ambassadors.view")) redirect("/app/admin");

    const res = await getAmbassador(params.uid);
    if (!res.success || !res.data) notFound();

    return (
        <div className="space-y-3">
            <Link
                href="/app/admin/ambassadors"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-forest transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" /> All ambassadors
            </Link>
            <AmbassadorDetailView initial={res.data} />
        </div>
    );
}
