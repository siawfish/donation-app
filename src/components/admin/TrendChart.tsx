import { TrendPoint } from "@/app/app/actions/analytics";

/**
 * Hand-rolled SVG rather than a charting library — recharts was removed as dead
 * weight during the cleanup, and three grouped bars do not justify pulling a
 * ~500KB dependency back in.
 */
const SERIES = [
    { key: "signups", label: "Signups", fill: "#0C3B2E" },
    { key: "listings", label: "Listed", fill: "#35a26d" },
    { key: "rehomed", label: "Rehomed", fill: "#D9F36E" },
] as const;

export function TrendChart({ points }: { points: TrendPoint[] }) {
    const max = Math.max(1, ...points.flatMap((p) => [p.signups, p.listings, p.rehomed]));

    const H = 168;          // plot height
    const GROUP = 100 / points.length;
    const BAR = GROUP / 5;  // three bars plus padding inside each group

    const empty = points.every((p) => p.signups + p.listings + p.rehomed === 0);

    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                {SERIES.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.fill }} />
                        {s.label}
                    </span>
                ))}
            </div>

            {empty ? (
                <div className="h-[168px] rounded-2xl bg-sand flex items-center justify-center">
                    <p className="text-sm text-gray-400">No activity in this period yet</p>
                </div>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 100 ${H}`}
                        preserveAspectRatio="none"
                        className="w-full"
                        style={{ height: H }}
                        role="img"
                        aria-label="Monthly signups, listings and items rehomed over the last six months"
                    >
                        {/* gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                            <line
                                key={t}
                                x1="0"
                                x2="100"
                                y1={H - t * H}
                                y2={H - t * H}
                                stroke="#E8E6E0"
                                strokeWidth="0.5"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}

                        {points.map((p, i) => {
                            const groupX = i * GROUP;
                            return SERIES.map((s, j) => {
                                const value = p[s.key];
                                const h = (value / max) * (H - 8);
                                return (
                                    <rect
                                        key={`${p.month}-${s.key}`}
                                        x={groupX + BAR * (j + 1)}
                                        y={H - h}
                                        width={BAR}
                                        height={h}
                                        fill={s.fill}
                                        rx="0.6"
                                    >
                                        <title>{`${p.label} · ${s.label}: ${value}`}</title>
                                    </rect>
                                );
                            });
                        })}
                    </svg>

                    <div className="flex mt-2">
                        {points.map((p) => (
                            <span
                                key={p.month}
                                className="flex-1 text-center text-[11px] font-semibold text-gray-400"
                            >
                                {p.label}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
