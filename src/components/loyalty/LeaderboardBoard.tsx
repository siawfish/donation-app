import { LeaderboardEntry } from "@/lib/loyalty";
import { getInitials } from "@/lib/utils";
import { TierBadge } from "./TierBadge";
import { Gift, Package } from "lucide-react";

function Avatar({ entry, size = 44 }: { entry: LeaderboardEntry; size?: number }) {
    return entry.profileUrl ? (
        // Avatars come from arbitrary user URLs, so a plain img avoids
        // next/image remote-host configuration for every possible domain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={entry.profileUrl}
            alt={entry.name}
            width={size}
            height={size}
            className="rounded-full object-cover flex-shrink-0"
            style={{ width: size, height: size }}
        />
    ) : (
        <span
            className="rounded-full bg-forest text-lime font-bold flex items-center justify-center flex-shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
            {getInitials(entry.name)}
        </span>
    );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function PodiumCard({
    entry,
    place,
    isMe,
}: {
    entry: LeaderboardEntry;
    place: 0 | 1 | 2;
    isMe: boolean;
}) {
    const first = place === 0;

    return (
        <div
            className={`relative rounded-3xl p-5 text-center flex flex-col items-center ${
                first ? "bg-lime md:pt-8 md:pb-7" : "bg-white border border-gray-200/70"
            } ${isMe ? "ring-2 ring-forest ring-offset-2 ring-offset-canvas" : ""}`}
        >
            <span className="text-3xl leading-none mb-3">{MEDALS[place]}</span>
            <Avatar entry={entry} size={first ? 64 : 52} />
            <p className={`mt-3 font-bold leading-tight ${first ? "text-forest text-lg" : "text-ink text-sm"}`}>
                {entry.name}
            </p>
            {entry.location && (
                <p className={`text-[11px] mt-0.5 truncate max-w-full ${first ? "text-forest/60" : "text-gray-400"}`}>
                    {entry.location}
                </p>
            )}
            <p className={`mt-3 font-extrabold ${first ? "text-forest text-3xl" : "text-ink text-2xl"}`}>
                {entry.points.toLocaleString()}
            </p>
            <p className={`text-[11px] ${first ? "text-forest/60" : "text-gray-400"}`}>points</p>
            <div className="mt-3">
                <TierBadge tierId={entry.tierId} />
            </div>
        </div>
    );
}

export function LeaderboardBoard({
    entries,
    currentUserId,
    /** label for what the points represent, e.g. "passed on" */
    metricLabel = "points",
}: {
    entries: LeaderboardEntry[];
    currentUserId?: string;
    metricLabel?: string;
}) {
    if (entries.length === 0) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl px-8 py-14 text-center">
                <p className="text-3xl mb-3">🌱</p>
                <p className="text-lg font-bold text-ink">Nobody on the board yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                    Be the first — list something you no longer need and you&apos;ll take the top spot.
                </p>
            </div>
        );
    }

    const podium = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <div className="space-y-4">
            {/* Podium — 1st sits in the middle on desktop, first on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 sm:items-end">
                {podium[1] && (
                    <div className="order-2 sm:order-1">
                        <PodiumCard entry={podium[1]} place={1} isMe={podium[1].userId === currentUserId} />
                    </div>
                )}
                {podium[0] && (
                    <div className="order-1 sm:order-2">
                        <PodiumCard entry={podium[0]} place={0} isMe={podium[0].userId === currentUserId} />
                    </div>
                )}
                {podium[2] && (
                    <div className="order-3">
                        <PodiumCard entry={podium[2]} place={2} isMe={podium[2].userId === currentUserId} />
                    </div>
                )}
            </div>

            {/* Remaining ranks */}
            {rest.length > 0 && (
                <div className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden">
                    {rest.map((entry, i) => {
                        const isMe = entry.userId === currentUserId;
                        return (
                            <div
                                key={entry.userId}
                                className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 ${
                                    i !== rest.length - 1 ? "border-b border-gray-100" : ""
                                } ${isMe ? "bg-lime/40" : ""}`}
                            >
                                <span className="w-7 text-sm font-extrabold text-gray-400 tabular-nums flex-shrink-0">
                                    {entry.rank}
                                </span>
                                <Avatar entry={entry} size={38} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-ink truncate">
                                        {entry.name}
                                        {isMe && <span className="text-primary font-extrabold"> · you</span>}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                                        <span className="inline-flex items-center gap-1">
                                            <Gift className="w-3 h-3" /> {entry.donationsCompleted} passed on
                                        </span>
                                        <span className="hidden sm:inline-flex items-center gap-1">
                                            <Package className="w-3 h-3" /> {entry.itemsListed} listed
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden sm:block flex-shrink-0">
                                    <TierBadge tierId={entry.tierId} />
                                </div>
                                <div className="text-right flex-shrink-0 w-16">
                                    <p className="text-sm font-extrabold text-ink tabular-nums">
                                        {entry.points.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{metricLabel}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
