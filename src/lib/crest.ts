/**
 * Achievement crest renderer.
 *
 * Drawn with the Canvas 2D API rather than screenshotting the DOM
 * (html2canvas et al). Two reasons: no extra dependency, and no tainted-canvas
 * problem — a user's avatar is served cross-origin, and drawing it would make
 * `toBlob` throw a SecurityError. Initials are drawn instead.
 */

export const CREST_W = 1080;
export const CREST_H = 1350;

const FOREST = "#0C3B2E";
const FOREST_2 = "#0A3328";
const LIME = "#D9F36E";
const WHITE = "#FFFFFF";

export interface CrestConfig {
    variant: "overall" | "achievement" | "organisation";
    name: string;
    tier: { name: string; emoji: string; blurb: string };
    points: number;
    rank: number | null;
    totalRanked: number;
    stats: { donated: number; badges: number; invited: number };
    /**
     * Organisation crests report different things — households reached and
     * weight diverted rather than invites — so the three stat cells are
     * overridable rather than hard-coded to the member scheme.
     */
    statsRow?: { value: string; label: string }[];
    topBadges: { emoji: string; name: string }[];
    achievement?: { emoji: string; name: string; description: string };
}

/** Brand face if it has loaded, otherwise a sane sans stack. */
function font(weight: number, size: number) {
    return `${weight} ${size}px "Cabinet Grotesk", "Segoe UI", system-ui, sans-serif`;
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
    // Not all engines that we care about ship ctx.roundRect yet.
    if (typeof (ctx as any).roundRect === "function") {
        ctx.beginPath();
        (ctx as any).roundRect(x, y, w, h, r);
        return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

/** Shrink the font until the text fits `maxWidth`. Returns the size used. */
function fitFont(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    startSize: number,
    weight: number,
    min = 20
): number {
    let size = startSize;
    ctx.font = font(weight, size);
    while (ctx.measureText(text).width > maxWidth && size > min) {
        size -= 2;
        ctx.font = font(weight, size);
    }
    return size;
}

/** Draw text centred on `cx`, wrapping at `maxWidth`. Returns the ending y. */
function wrapCentered(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number {
    const words = text.split(" ");
    let line = "";
    let cursor = y;

    for (const word of words) {
        const attempt = line ? `${line} ${word}` : word;
        if (ctx.measureText(attempt).width > maxWidth && line) {
            ctx.fillText(line, cx, cursor);
            cursor += lineHeight;
            line = word;
        } else {
            line = attempt;
        }
    }
    if (line) {
        ctx.fillText(line, cx, cursor);
        cursor += lineHeight;
    }
    return cursor;
}

function background(ctx: CanvasRenderingContext2D) {
    const bg = ctx.createLinearGradient(0, 0, CREST_W, CREST_H);
    bg.addColorStop(0, FOREST);
    bg.addColorStop(1, FOREST_2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CREST_W, CREST_H);

    // Matches the radial glows of the .forest-panel treatment in the app
    const glowA = ctx.createRadialGradient(920, 60, 0, 920, 60, 620);
    glowA.addColorStop(0, "rgba(217,243,110,0.16)");
    glowA.addColorStop(1, "rgba(217,243,110,0)");
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, CREST_W, CREST_H);

    const glowB = ctx.createRadialGradient(120, 1290, 0, 120, 1290, 640);
    glowB.addColorStop(0, "rgba(53,162,109,0.34)");
    glowB.addColorStop(1, "rgba(53,162,109,0)");
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, CREST_W, CREST_H);

    // Inner frame
    ctx.strokeStyle = "rgba(217,243,110,0.22)";
    ctx.lineWidth = 2;
    roundRect(ctx, 40, 40, CREST_W - 80, CREST_H - 80, 44);
    ctx.stroke();
}

function header(ctx: CanvasRenderingContext2D, label: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = LIME;
    ctx.font = font(800, 40);
    ctx.letterSpacing = "8px";
    ctx.fillText("GIVNY", CREST_W / 2, 130);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = font(700, 22);
    ctx.letterSpacing = "6px";
    ctx.fillText(label.toUpperCase(), CREST_W / 2, 178);
    ctx.letterSpacing = "0px";
}

function medallion(ctx: CanvasRenderingContext2D, emoji: string, cy: number, r: number) {
    ctx.fillStyle = LIME;
    ctx.beginPath();
    ctx.arc(CREST_W / 2, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CREST_W / 2, cy, r + 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(400, r * 1.1);
    ctx.fillText(emoji, CREST_W / 2, cy + 4);
    ctx.textBaseline = "alphabetic";
}

function statsRow(
    ctx: CanvasRenderingContext2D,
    y: number,
    cells: { value: string; label: string }[]
) {
    const colW = (CREST_W - 200) / cells.length;
    cells.forEach((cell, i) => {
        const cx = 100 + colW * i + colW / 2;

        ctx.textAlign = "center";
        ctx.fillStyle = LIME;
        ctx.font = font(800, 62);
        ctx.fillText(cell.value, cx, y);

        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = font(700, 21);
        ctx.letterSpacing = "3px";
        ctx.fillText(cell.label.toUpperCase(), cx, y + 40);
        ctx.letterSpacing = "0px";

        if (i < cells.length - 1) {
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(100 + colW * (i + 1), y - 48);
            ctx.lineTo(100 + colW * (i + 1), y + 52);
            ctx.stroke();
        }
    });
}

/**
 * Lays chips out in centred rows. `maxRows` is a hard clip — the canvas has no
 * layout engine, so an extra row would silently overlap the footer rather than
 * pushing it down.
 */
function badgeChips(
    ctx: CanvasRenderingContext2D,
    badges: { emoji: string; name: string }[],
    y: number,
    maxRows = 1
) {
    if (badges.length === 0) return;

    const padX = 26;
    const gap = 16;
    ctx.font = font(700, 26);

    const widths = badges.map((b) => ctx.measureText(`${b.emoji}  ${b.name}`).width + padX * 2);
    const rows: number[][] = [[]];
    let rowW = 0;

    widths.forEach((w, i) => {
        if (rowW + w + gap > CREST_W - 160 && rows[rows.length - 1].length > 0) {
            rows.push([]);
            rowW = 0;
        }
        rows[rows.length - 1].push(i);
        rowW += w + gap;
    });

    rows.slice(0, maxRows).forEach((row, rowIndex) => {
        const totalW = row.reduce((sum, i) => sum + widths[i], 0) + gap * (row.length - 1);
        let x = (CREST_W - totalW) / 2;
        const rowY = y + rowIndex * 70;

        row.forEach((i) => {
            ctx.fillStyle = "rgba(255,255,255,0.10)";
            roundRect(ctx, x, rowY, widths[i], 56, 28);
            ctx.fill();
            ctx.strokeStyle = "rgba(217,243,110,0.30)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = WHITE;
            ctx.font = font(700, 26);
            ctx.textAlign = "center";
            ctx.fillText(`${badges[i].emoji}  ${badges[i].name}`, x + widths[i] / 2, rowY + 37);

            x += widths[i] + gap;
        });
    });
}

function footer(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.font = font(700, 24);
    ctx.fillText("Everything here is free  ·  givny", CREST_W / 2, CREST_H - 90);
}

/** Renders the crest into `canvas`. Call after `document.fonts.ready`. */
export function drawCrest(canvas: HTMLCanvasElement, cfg: CrestConfig) {
    canvas.width = CREST_W;
    canvas.height = CREST_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CREST_W, CREST_H);
    background(ctx);

    if (cfg.variant === "achievement" && cfg.achievement) {
        const a = cfg.achievement;
        header(ctx, "Achievement unlocked");
        medallion(ctx, a.emoji, 480, 150);

        ctx.textAlign = "center";
        ctx.fillStyle = LIME;
        const nameSize = fitFont(ctx, a.name, CREST_W - 200, 84, 800);
        ctx.font = font(800, nameSize);
        ctx.fillText(a.name, CREST_W / 2, 740);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = font(400, 32);
        wrapCentered(ctx, a.description, CREST_W / 2, 800, CREST_W - 280, 44);

        // Attribution
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = font(700, 22);
        ctx.letterSpacing = "4px";
        ctx.fillText("EARNED BY", CREST_W / 2, 960);
        ctx.letterSpacing = "0px";

        ctx.fillStyle = WHITE;
        const who = fitFont(ctx, cfg.name, CREST_W - 220, 64, 800);
        ctx.font = font(800, who);
        ctx.fillText(cfg.name, CREST_W / 2, 1030);

        statsRow(ctx, 1170, [
            { value: String(cfg.stats.donated), label: "Passed on" },
            { value: String(cfg.stats.badges), label: "Badges" },
            { value: cfg.rank ? `#${cfg.rank}` : "—", label: "Rank" },
        ]);

        footer(ctx);
        return;
    }

    if (cfg.variant === "organisation") {
        header(ctx, `${cfg.tier.name} on Givny`);
        medallion(ctx, cfg.tier.emoji, 400, 130);

        ctx.textAlign = "center";
        ctx.fillStyle = LIME;
        ctx.font = font(800, 60);
        ctx.fillText(cfg.tier.name, CREST_W / 2, 630);

        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = font(400, 28);
        wrapCentered(ctx, cfg.tier.blurb, CREST_W / 2, 676, CREST_W - 280, 40);

        // The organisation's name is the point of the image, so it gets the
        // largest treatment on the card and wraps rather than shrinking away.
        ctx.fillStyle = WHITE;
        const orgSize = fitFont(ctx, cfg.name, CREST_W - 200, 78, 800, 40);
        ctx.font = font(800, orgSize);
        ctx.fillText(cfg.name, CREST_W / 2, 800);

        ctx.fillStyle = WHITE;
        ctx.font = font(800, 120);
        ctx.fillText(cfg.points.toLocaleString(), CREST_W / 2, 940);
        ctx.fillStyle = "rgba(255,255,255,0.40)";
        ctx.font = font(700, 24);
        ctx.letterSpacing = "6px";
        ctx.fillText("POINTS", CREST_W / 2, 980);
        ctx.letterSpacing = "0px";

        statsRow(ctx, 1090, cfg.statsRow ?? [
            { value: String(cfg.stats.donated), label: "Passed on" },
            { value: String(cfg.stats.badges), label: "Badges" },
            { value: String(cfg.stats.invited), label: "Followers" },
        ]);

        badgeChips(ctx, cfg.topBadges, 1160, 1);
        footer(ctx);
        return;
    }

    /* ── Overall crest ── */
    header(ctx, `${cfg.tier.name} division`);
    medallion(ctx, cfg.tier.emoji, 400, 130);

    ctx.textAlign = "center";
    ctx.fillStyle = LIME;
    ctx.font = font(800, 76);
    ctx.fillText(cfg.tier.name, CREST_W / 2, 640);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = font(400, 28);
    ctx.fillText(cfg.tier.blurb, CREST_W / 2, 686);

    ctx.fillStyle = WHITE;
    const nameSize = fitFont(ctx, cfg.name, CREST_W - 220, 62, 800);
    ctx.font = font(800, nameSize);
    ctx.fillText(cfg.name, CREST_W / 2, 782);

    // Points
    ctx.fillStyle = WHITE;
    ctx.font = font(800, 132);
    ctx.fillText(cfg.points.toLocaleString(), CREST_W / 2, 920);
    ctx.fillStyle = "rgba(255,255,255,0.40)";
    ctx.font = font(700, 24);
    ctx.letterSpacing = "6px";
    ctx.fillText("POINTS", CREST_W / 2, 960);
    ctx.letterSpacing = "0px";

    statsRow(ctx, 1090, [
        { value: String(cfg.stats.donated), label: "Passed on" },
        { value: String(cfg.stats.badges), label: "Badges" },
        {
            value: cfg.rank ? `#${cfg.rank}` : "—",
            label: cfg.rank ? `of ${cfg.totalRanked}` : "Rank",
        },
    ]);

    // Single row: chips occupy 1160–1216, clear of the footer baseline at 1260.
    badgeChips(ctx, cfg.topBadges, 1160, 1);
    footer(ctx);
}

export function crestToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
