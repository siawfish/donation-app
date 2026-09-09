# Front-End UI/UX Stack

A reusable front-end system extracted from a production Next.js app. **Colour is deliberately excluded** — everything here is structure, type, rhythm, motion, behaviour and copy, so it can be dropped onto any brand palette.

Every value below is the one actually shipping, not an idealised version.

---

## 1. The stack

| Concern | Choice | Why this one |
|---|---|---|
| Framework | Next.js App Router + React 18 | Server Components mean most UI ships zero JS |
| Styling | Tailwind CSS | Utility classes keep style next to markup; no CSS file drift |
| Primitives | Radix UI | Unstyled, accessible-by-default: focus traps, ARIA, keyboard nav |
| Variants | `class-variance-authority` | Typed component variants without conditional-class spaghetti |
| Class merging | `tailwind-merge` + `clsx` | Lets a caller override a base class without specificity fights |
| Icons | `lucide-react` | One consistent stroke weight; tree-shakeable |
| Motion | `framer-motion` + CSS keyframes | CSS for entrances, Framer only for orchestration |
| Toasts | `sonner` | Sensible stacking and dismissal out of the box |
| Forms | Formik + Yup (→ prefer React Hook Form + Zod) | See §12 |
| URL state | `nuqs` | Filters and tabs as query params, so views are shareable |
| Dates | `date-fns` | Tree-shakeable; `formatDistanceToNow` for relative time |
| Dropzone | `react-dropzone` | Drag-drop + click-to-browse with one hook |

**The philosophy:** Radix supplies behaviour and accessibility, Tailwind supplies appearance, and you write neither from scratch. Never hand-roll a dropdown, dialog or popover — focus management and `aria-*` wiring are where hand-rolled components fail.

---

## 2. Typography — a two-family split

One display family for anything a user *scans*, one text family for anything they *read*.

```css
body                     → Text family    (400)
h1–h6, label, a          → Display family (700)
```

Applied globally in `@layer base`, so nothing needs a font class:

```css
@layer base {
  body { font-family: var(--font-text); font-weight: 400; }
  h1, h2, h3, h4, h5, h6, label, a { font-family: var(--font-display); }
}
```

**Why `label` and `a` get the display face:** they are interface, not prose. Buttons, links and field labels are scanned in a glance — pairing them with headings makes the interface feel like one system and the body copy visibly *different in kind*.

### Display scale

Headings are set tight; body copy is set loose. This contrast does most of the visual work.

| Role | Size | Tracking | Leading |
|---|---|---|---|
| Hero | `text-4xl sm:text-5xl md:text-6xl` | `tracking-tight` | `leading-[1.03]` |
| Page title | `text-3xl md:text-4xl` | `tracking-tight` | default |
| Section title | `text-xl` / `text-2xl` | `tracking-tight` | default |
| Card title | `text-sm` / `text-base` **bold** | — | `leading-tight` |
| Body | `text-sm` / `text-base` | — | `leading-relaxed` |
| Meta / caption | `text-xs`, `text-[11px]` | — | `leading-tight` |
| Eyebrow | `text-xs font-bold uppercase` | `tracking-[0.2em]` | — |

Two rules that carry a lot of weight:

- **Negative tracking on large text only.** `tracking-tight` from ~`text-2xl` up. Applied to small text it hurts legibility.
- **Wide tracking on tiny uppercase labels.** `tracking-[0.1em]`–`tracking-[0.2em]` on 11–12px uppercase eyebrows. Uppercase without extra letter-spacing reads as shouting.

### The eyebrow pattern

A small uppercase label above a heading, used everywhere to orient without adding a second heading level:

```html
<p class="text-xs font-bold tracking-[0.2em] uppercase mb-3">Section</p>
<h2 class="text-3xl md:text-4xl font-bold tracking-tight">The actual heading</h2>
```

### Long-form prose

Article body is a single `.prose-*` component class, not utilities on every element:

```css
.prose-article       { font-size: 1.0625rem; line-height: 1.75; }
.prose-article h2    { font-size: 1.75rem;  margin-top: 2.25em; }
.prose-article h3    { font-size: 1.35rem;  margin-top: 2em; }
.prose-article h2,h3 { font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
.prose-article blockquote { padding-left: 1.15em; font-size: 1.15rem; line-height: 1.6; font-weight: 500; }
```

17px at 1.75 line-height, in a **720px column**. Wider than that and the eye loses its place returning to the next line. Heading margins are in `em` so they scale with the text.

### Numbers

Use `tabular-nums` on **every** number that can change — counters, prices, stats, ranks, timers. Without it, digits have different widths and the layout jitters on each update.

---

## 3. Spacing, radius and elevation

### Radius language

Radius encodes scale. Bigger surface, rounder corner:

| Element | Radius |
|---|---|
| Pills, buttons, avatars, chips | `rounded-full` |
| Large content cards, panels, hero surfaces | `rounded-3xl` (24px) |
| Inputs, medium cards, list tiles | `rounded-2xl` (16px) |
| Dense admin panels, table containers | `rounded-lg` (8px) |
| Admin buttons and inputs | `rounded-md` (6px) |

**Every interactive pill is `rounded-full`.** It is the single most recognisable thing about a UI like this — buttons, filter chips, tabs, badges all share it, so "this is clickable" is legible before you read the label.

### Spacing rhythm

Stick to a small set and repeat it:

- Between cards in a stack: `space-y-4` / `space-y-5`
- Grid gutters: `gap-3` mobile → `gap-5` desktop
- Card padding: `p-5 md:p-6` (large), `p-4` (admin dense), `px-4 py-3.5` (list rows)
- Section rhythm: `py-12 md:py-16`
- Label → control: `mt-1.5`
- Control → helper text: `mt-1` / `mt-2`

### Elevation

Borders do the separating; shadows are reserved for *lift*.

```
Resting card    → 1px border, no shadow
Hovered card    → translateY(-4px) + a large soft shadow
Floating layer  → shadow only (dropdowns, sheets, the logo over a cover image)
```

A UI where everything has a shadow has no hierarchy. Default to a hairline border.

---

## 4. Layout

### Container widths

Four, chosen by content type — not one global container:

| Width | Use |
|---|---|
| `720px` | Long-form reading (articles) |
| `1100px` | Standard content pages, directories, storefronts |
| `1400px` | Dense grids and dashboards |
| `420px` | Auth forms, narrow dialogs |

### Grid defaults

```html
<!-- Card grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

<!-- Stat row: 2-up on mobile, 4-up on desktop — never 4-up on a phone -->
<div class="grid grid-cols-2 md:grid-cols-4">

<!-- Editor / sidebar -->
<div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
```

### Horizontal-scroll rails

For tag filters, category tabs and "you follow" strips — better than wrapping to three rows on a phone:

```html
<ul class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
  <li class="flex-shrink-0 snap-start">…</li>
</ul>
```

The `-mx-1 px-1` pair lets focus rings and shadows breathe without the first item looking inset.

### Body-level guards

```css
body { overflow-x: clip; }          /* NOT hidden — see §13 */
img, svg, video, canvas { max-width: 100%; }
```

Two lines that prevent most "why is there sideways scroll on mobile" bugs permanently.

---

## 5. Two design systems, on purpose

A public site and an admin backend want opposite things. Trying to serve both with one component set produces a marketing site that is tiring to work in and an admin that looks unfinished.

| | Public | Admin |
|---|---|---|
| Density | Generous | Compact |
| Base text | `text-sm` / `text-base` | `text-[13px]` / `text-xs` |
| Radius | `rounded-2xl` / `rounded-3xl` | `rounded-md` / `rounded-lg` |
| Card padding | `p-5 md:p-6` | `p-4`, header `px-4 py-2.5` |
| Buttons | `px-5 py-2.5 rounded-full` | `px-2.5 py-1.5 rounded-md` |
| Layout | Cards and editorial rhythm | Tables and panels |
| Goal | Persuade and orient | Scan and act, all day |

Keep them in separate folders (`components/ui/*` and `components/admin/*`) with their own primitives. The admin set needs about eight: `Panel`, `Table`/`Th`/`Td`/`Tr`, `Badge`, `Button`, `Input`, `Segmented`, `Stat`, `SectionLabel`.

The admin `Panel` shape, which everything else sits inside:

```tsx
<Panel title="Comments" description="12 in total · 2 hidden" actions={<Segmented … />}>
  {/* `flush` drops body padding when a table manages its own */}
</Panel>
```

---

## 6. Motion

Motion is for **entrances and feedback**, never decoration.

```css
@keyframes fadeInUp { from { transform: translateY(24px); opacity: 0 }
                      to   { transform: translateY(0);    opacity: 1 } }
@keyframes slideUp  { from { transform: translateY(100%); opacity: 0 }
                      to   { transform: translateY(0);    opacity: 1 } }
```

| Interaction | Duration | Easing |
|---|---|---|
| Hover / colour change | `0.2s` | `ease` |
| Card lift | `0.25s` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Entrance | `0.3s`–`0.5s` | `ease-out` |
| Accordion open/close | `0.2s` | `ease-out` |

`cubic-bezier(0.22, 1, 0.36, 1)` is a strong ease-out — fast start, soft landing. It is the one curve worth memorising; it makes interactions feel responsive rather than floaty.

### Staggering

A list that animates in all at once reads as a flash. Offset children by ~80ms:

```css
.stagger > *:nth-child(1) { animation-delay: 0ms }
.stagger > *:nth-child(2) { animation-delay: 80ms }
/* … cap at 8; past that the last item feels broken */
```

### Rules

- **Never animate `width`, `height`, `top` or `left`.** Only `transform` and `opacity` are cheap.
- Image hover: `scale-[1.03]` over `duration-500` inside `overflow-hidden`. Anything larger looks like a mistake.
- Always pair a `transition` with the properties it covers, not `transition-all`.
- **Honour reduced motion** (see §11 — this is the gap in the original):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Interaction state — where UX is actually won

### Every async surface needs four states

Design all four before building any of them:

1. **Loading** — spinner with a word, never a bare spinner
2. **Empty** — explain *why* it's empty and give the next action
3. **Error** — say what happened in plain language, offer a retry
4. **Populated**

The empty state is the one teams skip and users hit first. Write it as a sentence, not a label:

> "Nothing listed yet. Your first item makes the page worth sharing."

Not: *"No results."*

### Empty ≠ filtered-empty

Two different messages. "Nobody has commented yet" and "Nothing matches that filter" require different actions from the user.

### Optimistic updates, reconciled by the server

```tsx
const toggle = () => {
  const previous = state;
  setState(optimistic(state));          // instant feedback
  startTransition(async () => {
    const res = await action();
    if (!res.success) { setState(previous); toast.error(res.message); return; }
    setState(res.data);                 // server is the truth
  });
};
```

Disable the control while in flight (`disabled={busy}`) so a double-tap cannot race the round trip.

### Refresh *before* releasing the button

```ts
const res = await mutate();
await refresh();     // ← await this
setBusy(null);
toast.success(res.message);
```

If you fire the refresh without awaiting, the button goes idle and the toast appears while the rest of the page still shows stale data. Users read a save that visibly changes nothing as a save that failed. **This is the single most common "it's broken" report that isn't a bug.**

### Progressive disclosure

Show what has been achieved; fold away what hasn't:

```tsx
<button aria-expanded={open}>{open ? "Hide" : `${locked.length} still to earn`}</button>
```

Locked items still show progress (`7 / 25`) rather than hiding — the next rung is the motivation.

### Toast discipline

- Success: short. "Saved", "Posted", "Copied".
- Error: what went wrong *and* what to do. "Couldn't copy — long-press the address bar instead."
- Never toast something already visible on screen. Two feedback channels for one event is noise.

---

## 8. Forms

Layout, every field, no exceptions:

```
Label (semibold, small)
Control (mt-1.5)
Helper or counter (mt-1, small, muted)
```

Shared input class, defined once:

```
w-full bg-<surface> border rounded-2xl px-4 py-3
outline-none focus:border-<accent> focus:ring-2 focus:ring-<accent>/10
transition-all
```

`focus:ring-2` at 10% opacity gives a visible focus state that doesn't shout — and it must never be removed without a replacement.

### Show the constraint before it's violated

A live counter beside the label, not an error after submitting:

```tsx
<span className={ok ? "text-<accent>" : "text-<muted>"}>
  {ok ? `${length} characters` : `${length} / ${MIN} to finish setup`}
</span>
```

A rule that only appears *after* a failed save reads as the system being broken rather than the input being short. If a field has a minimum, a maximum, or a format, say so up front.

### Disable submit only for real problems

Disable for empty or invalid, never merely "untouched". A disabled button with no explanation is a dead end — pair it with the reason.

---

## 9. Responsive and mobile

### Stack, don't squeeze

The most common responsive bug is a flex row that *technically* fits. Give each block its own row on a phone:

```html
<div class="flex flex-col md:flex-row md:items-end gap-4 md:gap-5">
```

`flex-wrap` alone is not enough — it will happily crush a text block into a four-line column rather than move it. Check the **text**, not just whether things overlap.

### Primary action goes full width on mobile

```html
<span class="flex-1 md:flex-none [&>button]:w-full [&>button]:justify-center">
```

### Touch targets

Minimum 44×44px. `py-2.5` with `text-sm` gets there; `py-1.5` does not — keep the dense sizes for pointer-driven admin screens only.

### iOS safe areas (required for any installable/PWA build)

```css
:root {
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);
}
.pt-safe { padding-top: var(--safe-top); }
.pb-safe { padding-bottom: var(--safe-bottom); }
```

```ts
export const viewport = { viewportFit: "cover", themeColor: "…" };
// + statusBarStyle: "black-translucent"
```

Without this, a top nav sits under the notch and a bottom bar under the home indicator — both look fine in a simulator and are unusable in the hand. **Test on a real device with a notch.**

Where an element already has padding on that axis, compose explicitly (`padding-top: calc(1rem + var(--safe-top))`) rather than stacking the utility.

---

## 10. Copy and microcopy

The most transferable part of this system, and the cheapest to get right.

- **Say what happens, not what the thing is.** "Pass it on", not "Submit". "Do it →", not "Configure".
- **Write in the user's interest, not the product's.** "A storefront without a logo reads as abandoned, and people don't ask" beats "Add a logo to complete your profile."
- **Errors name the fix.** "Give a reason — they'll be told." Not "Reason required."
- **Never let a rule be invisible.** If something is rejected, the rule was stated somewhere the user already looked.
- **Numbers get a unit and a hedge when estimated.** "diverted, est." not "kg". An honest estimate is more usable than a false precision.
- **Empty states point forward.** Always end with the next action.
- **Sentence case everywhere** except deliberate uppercase eyebrows.
- **Avoid the word "please".** It pads without adding meaning.

---

## 11. Accessibility

What this system gets right by construction:

- Radix primitives ship focus traps, roving tab index and ARIA wiring
- `aria-pressed` on every toggle; `aria-expanded` on every disclosure
- `aria-current="page"` on the active nav item
- Decorative emoji and icons marked `aria-hidden="true"`
- Semantic landmarks (`<section>`, `<header>`, `<time datetime>`, `<ul>/<li>`)
- Visible focus rings (`focus:ring-2`) rather than `outline: none`

**Gaps in the original — fix these on day one of the next project:**

- No `prefers-reduced-motion` block. Add the one in §6.
- No global `:focus-visible` style, so keyboard focus depends on each component remembering. Add a single base rule.
- Icon-only buttons need `aria-label` — easy to forget on a share or close button.
- Colour is used alone to signal state in a few places; pair it with an icon or text so it survives colour blindness and greyscale printing.

---

## 12. Library choices to revisit

- **React Hook Form + Zod** over Formik + Yup. Formik is effectively unmaintained and re-renders the whole form on each keystroke; RHF is uncontrolled by default. Zod infers types properly and one schema can validate both the form and the server action.
- **`next/font`** over manual `@font-face`. Automatic preloading, `font-display: swap`, and self-hosting with zero layout shift.
- **Framer Motion is often unnecessary.** CSS keyframes cover entrances and hovers. Reach for it only when you need orchestration, layout animation or gestures — it is a large dependency for a fade.
- **Consider `next-themes`** only if you actually ship a dark mode; otherwise it is dead weight.

---

## 13. Traps

| Trap | Symptom | Fix |
|---|---|---|
| Dynamic class names — `` `text-${align}` `` | Style silently missing | Literal lookup map: `{ left: "text-left", … }` |
| Backticks inside a Tailwind config value | Class emits invalid CSS, browser drops it, corners go square | Config values are plain strings: `'var(--radius)'` not `` '`var(--radius)`' `` |
| `overflow-x: hidden` on `body` | Sticky headers stop sticking | Use `overflow-x: clip` |
| Reading `navigator`/`window` during render | Hydration mismatch | Decide in `useEffect`, default to the server-safe value |
| `transition-all` | Janky, animates unintended properties | Name the properties |
| Animating `width`/`height`/`top` | Dropped frames | `transform` and `opacity` only |
| JSX comment directly after `return (` | Build failure | Put `//` comments above the `return` |
| Icon fonts / CDN CSS in a PWA | Breaks offline, blocked by CSP | Bundle everything locally |
| `flex-wrap` used as a responsive strategy | Text crushed into narrow columns | `flex-col md:flex-row` |
| Number without `tabular-nums` | Layout jitters as values change | Add it to every changing figure |

---

## 14. Checklist for a new project

**Before the first screen**

1. Pick two font families — display and text — and wire them in `@layer base`
2. Define the radius language (which size means which kind of surface)
3. Fix the container widths (reading / standard / dense / narrow)
4. Write the base layer: `overflow-x: clip`, media `max-width`, safe-area variables
5. Add the `prefers-reduced-motion` block and a global `:focus-visible` style
6. Install Radix + `cva` + `tailwind-merge`; scaffold Button, Input, Dialog

**While building**

7. Build the four states (loading / empty / error / populated) for every async surface
8. Keep public and admin primitives in separate folders from the start
9. Put every constraint next to its input, never only in the error
10. `tabular-nums` on every changing number
11. `aria-pressed` / `aria-expanded` / `aria-current` on toggles, disclosures, nav

**Before shipping**

12. Test on a real notched phone, not a simulator
13. Tab through every page — can you see where focus is, at all times?
14. Read every empty state aloud; if it doesn't say what to do next, rewrite it
15. Set the OS to reduced motion and confirm nothing important disappears
