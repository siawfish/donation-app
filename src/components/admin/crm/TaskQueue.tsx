"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, listOpenTasks, setTaskStatus } from "@/app/app/actions/crm";
import { CrmTask, taskUrgency, todayISO } from "@/lib/crm";
import {
    Badge, Button, EmptyRow, Num, Panel, SkeletonRows,
    Table, TableWrap, Td, Th, Tr,
} from "../ui";

const COLS = 5;

/** Open follow-ups across every member, soonest first. */
export function TaskQueue({ canManage }: { canManage: boolean }) {
    const [rows, setRows] = useState<CrmTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    // Computed once on the client so every row agrees on what "today" means.
    const [today, setToday] = useState<string>("");

    const load = useCallback(async () => {
        const res = await listOpenTasks();
        if (!res.success) toast.error(res.message);
        setRows(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { setToday(todayISO()); load() }, [load]);

    const close = (t: CrmTask) => {
        setBusy(t.id!);
        startTransition(async () => {
            const res = await setTaskStatus(t.id!, "done", t.memberId);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const remove = (t: CrmTask) => {
        if (!window.confirm(`Delete "${t.title}"?`)) return;
        setBusy(t.id!);
        startTransition(async () => {
            const res = await deleteTask(t.id!, t.memberId);
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            load();
        });
    };

    const overdue = today ? rows.filter((r) => r.dueOn < today).length : 0;

    return (
        <Panel
            flush
            title="Follow-ups"
            description={overdue > 0 ? `${overdue} overdue` : "Nothing overdue"}
            actions={<Badge tone={overdue > 0 ? "bad" : "good"}>{rows.length} open</Badge>}
        >
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th>Task</Th>
                            <Th width="180px">Member</Th>
                            <Th width="130px">Owner</Th>
                            <Th align="right" width="110px">Due</Th>
                            <Th align="right" width="90px" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows rows={3} cols={COLS} />
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>No open follow-ups.</EmptyRow>
                        ) : (
                            rows.map((t) => {
                                const urgency = today ? taskUrgency(t.dueOn, today) : "upcoming";
                                return (
                                    <Tr key={t.id}>
                                        <Td className="font-medium text-ink">{t.title}</Td>
                                        <Td>
                                            <Link
                                                href={`/app/admin/crm/${t.memberId}`}
                                                className="text-forest hover:underline truncate block"
                                            >
                                                {t.memberName || "View member"}
                                            </Link>
                                        </Td>
                                        <Td className="text-gray-500 truncate">{t.assigneeName || "—"}</Td>
                                        <Td align="right">
                                            <Badge tone={urgency === "overdue" ? "bad" : urgency === "today" ? "warn" : "neutral"}>
                                                <Num>{urgency === "today" ? "Today" : t.dueOn}</Num>
                                            </Badge>
                                        </Td>
                                        <Td align="right">
                                            {canManage && (
                                                <div className="inline-flex gap-1">
                                                    <Button size="xs" onClick={() => close(t)} disabled={busy === t.id} title="Mark done">
                                                        {busy === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                    </Button>
                                                    <Button size="xs" variant="danger" onClick={() => remove(t)} disabled={busy === t.id} title="Delete">
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </Td>
                                    </Tr>
                                );
                            })
                        )}
                    </tbody>
                </Table>
            </TableWrap>
        </Panel>
    );
}
