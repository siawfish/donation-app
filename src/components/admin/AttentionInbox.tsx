import Link from "next/link";
import { BadgeCheck, Briefcase, CheckCircle2, ClipboardList, Megaphone } from "lucide-react";
import { AttentionCounts } from "@/lib/adminNav";
import { Panel } from "./ui";

/**
 * What is waiting on an admin, right now.
 *
 * Before this, finding out that three people were queued for verification meant
 * opening the verifications page — and finding out that *nobody* was queued meant
 * opening it too. Queues that must be visited to be discovered are queues that
 * get forgotten, so the overview answers the question directly.
 *
 * Rows appear only when they have something in them: an inbox of permanent zeros
 * teaches you to stop reading it.
 */
export function AttentionInbox({ attention }: { attention: AttentionCounts }) {
    const rows = [
        {
            id: "verifications",
            count: attention.verifications,
            icon: BadgeCheck,
            href: "/app/admin/verifications",
            label: (n: number) => `${n} identity check${n === 1 ? "" : "s"} waiting`,
            note: "Members can't earn the trust badge until someone reviews these.",
        },
        {
            id: "applications",
            count: attention.applications,
            icon: Briefcase,
            href: "/app/admin/jobs",
            label: (n: number) => `${n} new job application${n === 1 ? "" : "s"}`,
            note: "Candidates are waiting to hear something.",
        },
        {
            id: "tasks",
            count: attention.tasks,
            icon: ClipboardList,
            href: "/app/admin/crm",
            label: (n: number) => `${n} follow-up${n === 1 ? "" : "s"} due or overdue`,
            note: "Someone committed to doing these by today.",
        },
        {
            id: "ambassadors",
            count: attention.ambassadors,
            icon: Megaphone,
            href: "/app/admin/ambassadors",
            label: (n: number) => `${n} ambassador log${n === 1 ? "" : "s"} unreviewed`,
            note: "They can see whether their work was acknowledged.",
        },
    ].filter((r) => r.count > 0);

    if (rows.length === 0) {
        return (
            <Panel>
                <p className="flex items-center gap-2 text-[13px] text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Nothing is waiting on you.
                </p>
            </Panel>
        );
    }

    return (
        <Panel flush title="Waiting on you" description="Queues with somebody on the other end.">
            <ul>
                {rows.map((r, i) => (
                    <li key={r.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                        <Link
                            href={r.href}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 border border-amber-200 flex-shrink-0">
                                <r.icon className="w-4 h-4 text-amber-700" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-ink group-hover:text-forest transition-colors">
                                    {r.label(r.count)}
                                </span>
                                <span className="block text-xs text-gray-500 truncate">{r.note}</span>
                            </span>
                            <span className="text-[13px] font-semibold text-gray-400 group-hover:text-forest transition-colors flex-shrink-0">
                                Open →
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}
