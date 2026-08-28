"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
    Bold, CircleAlert, Italic, Link2, List, Loader2, Monitor, RotateCcw,
    Send, Smartphone, TriangleAlert, Type,
} from "lucide-react";
import { toast } from "sonner";
import {
    previewEmailTemplate, resetEmailTemplate, saveEmailTemplate, sendTemplateTest,
} from "@/app/app/actions/emailTemplates";
import {
    checkTemplate, hasBlockingError,
    type ResolvedTemplate, type TemplateWarning,
} from "@/lib/email/templates";
import { Badge, Button, Input, Panel, Textarea } from "../ui";

const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500";

/** Widths that matter: a phone, and a desktop reading pane. Not a monitor. */
const DEVICES = {
    mobile: { label: "Phone", width: 375, icon: Smartphone },
    desktop: { label: "Desktop", width: 620, icon: Monitor },
} as const;

type Device = keyof typeof DEVICES;

export interface EmailDraft {
    subject: string;
    preheader: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
    enabled?: boolean;
}

/**
 * The email editor.
 *
 * Markdown with a toolbar rather than a rich-text surface. A WYSIWYG editor
 * produces HTML that has to be re-written for email anyway — Outlook renders
 * through Word, Gmail strips <style> — so the authoring format stays plain and
 * the shell owns the layout. What makes it usable is the live preview at real
 * inbox widths and the checks running as you type.
 */
export function EmailEditor({
    template,
    onSaved,
    onClose,
}: {
    template: ResolvedTemplate;
    onSaved?: () => void;
    onClose?: () => void;
}) {
    const [draft, setDraft] = useState<EmailDraft>({
        subject: template.subject,
        preheader: template.preheader,
        body: template.body,
        ctaLabel: template.ctaLabel ?? "",
        ctaUrl: template.ctaUrl ?? "",
        enabled: template.enabled,
    });
    const [device, setDevice] = useState<Device>("mobile");
    const [html, setHtml] = useState("");
    const [testTo, setTestTo] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const set = <K extends keyof EmailDraft>(key: K, value: EmailDraft[K]) =>
        setDraft((d) => ({ ...d, [key]: value }));

    const warnings: TemplateWarning[] = checkTemplate(template, draft);
    const blocked = hasBlockingError(warnings);

    // The preview is rendered on the server by the same code that sends, so
    // what is on screen cannot drift from what lands in an inbox.
    const refreshPreview = useCallback(async () => {
        const res = await previewEmailTemplate(template.key, draft);
        if (res.data) setHtml(res.data.html);
    }, [template.key, draft]);

    useEffect(() => {
        const timer = setTimeout(refreshPreview, 400);
        return () => clearTimeout(timer);
    }, [refreshPreview]);

    /**
     * Wrap or insert at the caret rather than appending.
     *
     * An editor that drops a variable at the end of the message is one the
     * writer stops using by the third paragraph.
     */
    const insert = (before: string, after = "") => {
        const el = bodyRef.current;
        if (!el) return;

        const { selectionStart: start, selectionEnd: end, value } = el;
        const selected = value.slice(start, end);
        const next = value.slice(0, start) + before + selected + after + value.slice(end);

        set("body", next);
        requestAnimationFrame(() => {
            el.focus();
            const caret = start + before.length + selected.length;
            el.setSelectionRange(caret, caret);
        });
    };

    const run = (key: string, fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) => {
        setBusy(key);
        startTransition(async () => {
            const res = await fn();
            setBusy(null);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            after?.();
        });
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
            <div className="space-y-4">
                <Panel
                    title={template.name}
                    description={template.trigger}
                    actions={
                        <div className="flex items-center gap-2">
                            <Badge tone={template.category === "marketing" ? "info" : "neutral"}>
                                {template.category}
                            </Badge>
                            {template.customised && <Badge tone="warn">Customised</Badge>}
                            {!template.live && <Badge tone="neutral">Not wired up yet</Badge>}
                        </div>
                    }
                >
                    <div className="space-y-3">
                        <label className="block">
                            <span className="flex items-baseline justify-between gap-3">
                                <span className={LABEL}>Subject</span>
                                <span className={`text-[11px] tabular-nums ${
                                    draft.subject.length > 60 ? "text-amber-700" : "text-gray-400"
                                }`}>
                                    {draft.subject.length} / 60
                                </span>
                            </span>
                            <Input value={draft.subject} onChange={(e) => set("subject", e.target.value)} className="w-full mt-1" />
                        </label>

                        <label className="block">
                            <span className={LABEL}>Preheader</span>
                            <Input
                                value={draft.preheader}
                                onChange={(e) => set("preheader", e.target.value)}
                                placeholder="The grey line beside the subject in most inboxes."
                                className="w-full mt-1"
                            />
                        </label>

                        <div>
                            <span className={LABEL}>Message</span>
                            <div className="flex flex-wrap items-center gap-1 mt-1 mb-1.5">
                                <ToolbarButton label="Bold" onClick={() => insert("**", "**")}><Bold className="w-3.5 h-3.5" /></ToolbarButton>
                                <ToolbarButton label="Italic" onClick={() => insert("*", "*")}><Italic className="w-3.5 h-3.5" /></ToolbarButton>
                                <ToolbarButton label="Heading" onClick={() => insert("\n## ")}><Type className="w-3.5 h-3.5" /></ToolbarButton>
                                <ToolbarButton label="Bullet" onClick={() => insert("\n- ")}><List className="w-3.5 h-3.5" /></ToolbarButton>
                                <ToolbarButton label="Link" onClick={() => insert("[", "](https://)")}><Link2 className="w-3.5 h-3.5" /></ToolbarButton>

                                <span className="w-px h-4 bg-gray-200 mx-1" />

                                {template.vars.map((v) => (
                                    <button
                                        key={v.name}
                                        onClick={() => insert(`{{${v.name}}}`)}
                                        title={`${v.description} — e.g. ${v.example}`}
                                        className="rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] font-mono text-forest hover:bg-gray-50 transition-colors"
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>

                            <Textarea
                                ref={bodyRef}
                                rows={14}
                                value={draft.body}
                                onChange={(e) => set("body", e.target.value)}
                                className="w-full font-mono text-[12px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                                <span className={LABEL}>Button label</span>
                                <Input value={draft.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} className="w-full mt-1" />
                            </label>
                            <label className="block">
                                <span className={LABEL}>Button link</span>
                                <Input value={draft.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://… or {{variable}}" className="w-full mt-1" />
                            </label>
                        </div>
                    </div>
                </Panel>

                {warnings.length > 0 && (
                    <Panel title="Checks">
                        <ul className="space-y-1.5">
                            {warnings.map((w, i) => (
                                <li key={i} className={`flex items-start gap-2 text-xs leading-relaxed ${
                                    w.level === "error" ? "text-red-700" : "text-amber-800"
                                }`}>
                                    {w.level === "error"
                                        ? <CircleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        : <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                                    {w.message}
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}
            </div>

            <div className="space-y-4">
                <Panel
                    title="Preview"
                    description="Rendered by the same code that sends it."
                    actions={
                        <div className="flex items-center gap-1">
                            {(Object.keys(DEVICES) as Device[]).map((d) => {
                                const Icon = DEVICES[d].icon;
                                return (
                                    <Button
                                        key={d}
                                        size="xs"
                                        variant={device === d ? "primary" : "default"}
                                        onClick={() => setDevice(d)}
                                        aria-label={DEVICES[d].label}
                                    >
                                        <Icon className="w-3 h-3" />
                                    </Button>
                                );
                            })}
                        </div>
                    }
                >
                    {/* The inbox row: what a client shows before anything is opened. */}
                    <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
                        <p className="text-[11px] text-gray-500">Givny</p>
                        <p className="text-[13px] font-semibold text-ink truncate">
                            {draft.subject || "(no subject)"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                            {draft.preheader || "(inboxes will show the first line of the message)"}
                        </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        {/* srcDoc, so the email's own styles cannot leak into the
                            admin and the admin's cannot flatter the email. */}
                        <iframe
                            title="Email preview"
                            srcDoc={html}
                            sandbox=""
                            style={{ width: DEVICES[device].width, height: 520, border: 0, maxWidth: "100%" }}
                        />
                    </div>
                </Panel>

                <Panel title="Try it">
                    <label className="block">
                        <span className={LABEL}>Send a test to</span>
                        <Input
                            type="email"
                            value={testTo}
                            onChange={(e) => setTestTo(e.target.value)}
                            placeholder="you@givny.com"
                            className="w-full mt-1"
                        />
                    </label>
                    <Button
                        className="mt-2 w-full justify-center"
                        onClick={() => run("test", () => sendTemplateTest(template.key, testTo, draft))}
                        disabled={busy === "test" || !testTo.trim() || blocked}
                    >
                        {busy === "test" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send test
                    </Button>
                </Panel>

                <Panel title="Save">
                    <label className="flex items-start gap-2 cursor-pointer mb-3">
                        <input
                            type="checkbox"
                            checked={draft.enabled !== false}
                            onChange={(e) => set("enabled", e.target.checked)}
                            className="mt-0.5"
                        />
                        <span>
                            <span className="text-[13px] font-semibold text-ink">Send this email</span>
                            <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                Off keeps the wording but stops it going out.
                            </span>
                        </span>
                    </label>

                    <div className="space-y-2">
                        <Button
                            variant="primary"
                            className="w-full justify-center"
                            onClick={() => run("save", () => saveEmailTemplate(template.key, draft), onSaved)}
                            disabled={busy === "save" || blocked}
                        >
                            {busy === "save" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save template
                        </Button>

                        {template.customised && (
                            <Button
                                className="w-full justify-center"
                                onClick={() => run("reset", () => resetEmailTemplate(template.key), onSaved)}
                                disabled={busy === "reset"}
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset to the default
                            </Button>
                        )}

                        {onClose && (
                            <Button className="w-full justify-center" onClick={onClose}>Close</Button>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function ToolbarButton({
    label, onClick, children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className="rounded border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-ink transition-colors"
        >
            {children}
        </button>
    );
}
