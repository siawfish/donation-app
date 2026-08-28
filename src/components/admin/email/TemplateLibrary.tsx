"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { listEmailTemplates } from "@/app/app/actions/emailTemplates";
import type { ResolvedTemplate } from "@/lib/email/templates";
import { Badge, Button, Panel } from "../ui";
import { EmailEditor } from "./EmailEditor";

/**
 * Every email the platform can send, listed together.
 *
 * The list is the point as much as the editing is: until this existed, nobody
 * could answer "what do we actually send people?" without reading the codebase.
 */
export function TemplateLibrary() {
    const [rows, setRows] = useState<ResolvedTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [openKey, setOpenKey] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await listEmailTemplates();
        if (!res.success) toast.error(res.message);
        setRows(res.data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const open = rows.find((t) => t.key === openKey);

    if (open) {
        return (
            <EmailEditor
                template={open}
                onSaved={() => { load(); setOpenKey(null); }}
                onClose={() => setOpenKey(null)}
            />
        );
    }

    const groups: { title: string; note: string; category: ResolvedTemplate["category"] }[] = [
        {
            title: "Transactional",
            note: "Sent because of something the person did. No unsubscribe link — these are part of the product.",
            category: "transactional",
        },
        {
            title: "Marketing",
            note: "Campaign mail. Always carries an unsubscribe link and respects the opt-out list.",
            category: "marketing",
        },
    ];

    return (
        <div className="space-y-4">
            {groups.map((group) => {
                const items = rows.filter((t) => t.category === group.category);
                if (!items.length && !loading) return null;

                return (
                    <Panel key={group.category} flush title={group.title} description={group.note}>
                        {loading ? (
                            <p className="text-xs text-gray-500 px-4 py-8 text-center">Loading…</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {items.map((t) => (
                                    <li key={t.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            {t.category === "marketing"
                                                ? <Megaphone className="w-4 h-4 text-gray-500" />
                                                : <Mail className="w-4 h-4 text-gray-500" />}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] font-semibold text-ink">{t.name}</span>
                                            <span className="block text-[11px] text-gray-500 leading-snug">{t.trigger}</span>
                                            {t.subject && (
                                                <span className="block text-[11px] text-gray-400 mt-0.5 truncate">
                                                    {t.subject}
                                                </span>
                                            )}
                                        </span>

                                        {t.customised && <Badge tone="warn">Customised</Badge>}
                                        {!t.enabled && <Badge tone="bad">Off</Badge>}
                                        {/* Says outright which of these actually fire today,
                                            rather than implying the whole set is wired up. */}
                                        {!t.live && <Badge tone="neutral">Not wired up</Badge>}

                                        <Button onClick={() => setOpenKey(t.key)}>Edit</Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                );
            })}
        </div>
    );
}
