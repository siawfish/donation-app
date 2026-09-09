# Tech Stack Reference

A working blueprint extracted from **Givny** (a free community marketplace for Ghana), written to be reused on other projects.

It covers what the stack is, why each piece is there, the patterns worth copying, and — most usefully — the traps that cost real debugging time. Versions are the ones actually running, not "latest".

---

## 1. What this stack is good for

A **content-and-transactions web app with a real admin backend**, built by a small team, deployed serverlessly, with no dedicated backend service.

Good fit:

- Marketplaces, directories, community platforms
- Anything needing SEO-indexable public pages *and* an authenticated app
- Products where an admin/CRM surface matters as much as the user-facing app
- Projects that must ship fast without operating a database or a server

Bad fit:

- Heavy relational querying, reporting, or joins (Firestore will fight you)
- Anything needing transactions across many documents
- Real-time collaborative editing (use a CRDT stack instead)
- Teams that want a typed schema enforced at the database layer

---

## 2. The stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | `14.2.4` | Server Components + Server Actions |
| Language | TypeScript | `^5` | `strict` on |
| UI runtime | React | `^18.3.1` | Not 19 — see §11 |
| Styling | Tailwind CSS | `^3.4.1` | CSS-variable design tokens |
| Primitives | Radix UI | `^1.x` | Dialog, Popover, Tabs, Dropdown, Avatar… |
| Variants | `class-variance-authority` + `tailwind-merge` + `clsx` | — | shadcn/ui convention |
| Icons | `lucide-react` | `^0.522` | |
| Animation | `framer-motion` | `^11.9` | |
| Toasts | `sonner` | `^1.7` | |
| Database | Cloud Firestore | — | via Admin SDK server-side |
| Auth | Firebase Auth + `next-firebase-auth-edge` | `^1.8.2` | Session cookies, edge middleware |
| Storage | Firebase Storage | — | Images, CVs |
| Push | Firebase Cloud Messaging | — | Web push through a service worker |
| Admin SDK | `firebase-admin` | `^13.0.0` | Server-only |
| Client SDK | `firebase` | `^11.0.1` | Only for realtime listeners |
| Forms | Formik + Yup | `^2.4` / `^1.4` | |
| URL state | `nuqs` | `^2.1` | Query params as React state |
| Dates | `date-fns` | `^4.1` | |
| Maps | Leaflet | `^1.9.4` | Self-hosted CSS/markers, no CDN |
| Geocoding | OpenStreetMap Nominatim | — | Proxied through our own route |
| Email | `nodemailer` | `^6.10` | SMTP |
| Uploads | `react-dropzone` | `^14.3` | |
| Hosting | Vercel | — | |

---

## 3. Architecture decisions worth copying

### 3.1 Server Actions instead of API routes

Almost every mutation is a Server Action in `src/app/app/actions/*.ts`, not a REST route. You get end-to-end type safety with no client fetch layer, no serialisation boilerplate, and no route file per verb.

Every action returns the same envelope:

```ts
export interface ResponseData<T> {
  success: boolean;
  message: string;   // safe to show the user directly
  data: T;
}
```

Callers never need try/catch:

```ts
const res = await updateStorefront(form);
if (!res.success) { toast.error(res.message); return; }
```

**Use an API route only when something that is not your React app needs to call it** — webhooks, a service worker, a cron, an external client. In Givny that's exactly one route: the Nominatim proxy.

### 3.2 The Admin-SDK / client-SDK boundary

This is the most important decision in the whole stack. Draw it explicitly:

- **Admin SDK (server)** — everything that must not be forged. It bypasses security rules entirely, so authorisation is *your* code. All writes, all sensitive reads.
- **Client SDK (browser)** — only where you genuinely need `onSnapshot` realtime: chat, notifications, live counters.

Anything reachable from both gets rules written for the client path *and* checks in the action.

### 3.3 Default security rules to `false`

```
match /{document=**} {
  allow read, write: if false;
}
```

Then open only what the browser actually reads live. Roughly:

- **Public read, no write** — published content (posts with `status == "published"`, active organisations, open jobs)
- **Owner-scoped** — a user's own documents
- **Server-only (`if false`)** — anything one-per-person, any list of people, any audit trail

> **Rules cannot express "one per person."** That is a constraint over a *set* of documents, and expressing it needs a denormalised counter anyone can forge. Instead use a **deterministic document id** (`${postId}_${uid}`) plus a server write. You get the constraint for free and the collection stays closed.

### 3.4 Derive, don't store

Scores, impact metrics, onboarding checklists and leaderboards are all **computed at read time** from the source collections. Nothing is stored.

Why this is worth the read cost early on:

- No backfill when the scheme changes or a user joins
- A number can never drift out of sync with the facts behind it
- Nobody can edit their score into existence
- A stored checklist will eventually claim something is done that isn't

The trade is read volume. Cap the scan (`.limit(5000)`) and plan to move to a scheduled job that materialises the values once you outgrow it. Write that note in the code *when you build it*, not later.

### 3.5 Denormalise only for fan-out reads

The exception to §3.4: values needed by **every row of a list**. Stamping `orgName` onto an item at write time avoids one extra read per card in a grid. Whenever you denormalise, leave a comment saying what has to fan out if the source changes.

---

## 4. Auth: `next-firebase-auth-edge`

Firebase Auth is client-first; this library makes it work with Server Components by exchanging the ID token for a **signed HTTP-only session cookie** that edge middleware can verify.

```
middleware.ts  → authMiddleware() verifies/refreshes the cookie on every request
Server Component / Action → getTokens(await cookies(), authConfig)
Client (realtime only)    → signInWithCustomToken() using the custom token
```

Config lives in `src/firebase/config/server-config.ts`. Set:

- `enableCustomToken: true` — required if the browser needs a signed-in client SDK
- `enableMultipleCookies: true` — unless on Firebase Hosting
- `cookieSignatureKeys: [current, previous]` — two keys so you can rotate without logging everyone out

**The trap:** the session cookie and the client SDK are *two separate sessions*. A page can be fully authenticated server-side while `firebase/auth` in the browser still has no user — so every `onSnapshot` fails a rules check and, because listeners don't retry, stays dead for the whole page life. Gate every listener behind a hook that waits for the client SDK:

```ts
const ready = useClientAuthReady();
useEffect(() => {
  if (!ready) return;
  const unsub = onSnapshot(query, ...);
  return unsub;
}, [ready]);
```

---

## 5. Firestore in practice

**Query limits to design around**

- `in` / `array-contains-any`: 30 values → chunk your ids
- `!=` excludes documents where the field is *absent*, which is usually what you want
- Batch writes: 500 operations → chunk fan-outs (400 is a safe stride)
- Composite queries need composite indexes; Firestore's error message contains a link that creates one

**Aggregation**

`.count().get()` is a server-side count — far cheaper than reading documents to call `.length`.

**Deploying rules without the Firebase CLI**

If the CLI isn't available (or you want it in CI), the Rules REST API works with a service account:

```
POST https://firebaserules.googleapis.com/v1/projects/{project}/rulesets
POST https://firebaserules.googleapis.com/v1/projects/{project}/releases/cloud.firestore
```

Authenticate with `google-auth-library` and the same service account JSON. **Always validate before releasing** — creating a ruleset validates it, and only the release makes it live, so a two-step script gives you a free dry run.

---

## 6. Styling

Design tokens as CSS variables, surfaced through Tailwind:

```js
// tailwind.config.ts
colors: {
  canvas: 'var(--canvas)',
  ink:    'var(--ink)',
  forest: { DEFAULT: 'var(--forest)', dark: 'var(--forest-2)' },
  lime:   'var(--lime)',
  sand:   'var(--sand)',
  primary:{ DEFAULT: 'var(--primary)', light: 'var(--primary-light)' },
}
```

One palette, named for the brand rather than for hues (`forest`, not `green-800`), so a rebrand is a change to `globals.css`.

> **Tailwind JIT trap:** `` className={`text-${align}`} `` produces nothing. The scanner reads source text, not runtime values. Use a lookup map with literal class strings:
> ```ts
> const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };
> ```
> This applies to every dynamically-built class name, and it fails *silently*.

---

## 7. Project structure

```
src/
├── app/
│   ├── (public routes)/        # marketing, blog, directory — SEO-indexed
│   ├── app/                    # the authenticated product
│   │   ├── actions/            # ALL server actions, one file per domain
│   │   └── admin/              # admin backend
│   └── api/                    # only for non-React callers
├── components/
│   ├── ui/                     # generic primitives (shadcn-style)
│   ├── admin/                  # denser admin design system
│   └── <domain>/               # feature components
├── lib/                        # pure logic — no I/O, no React
├── firebase/                   # init, config, client auth context
└── hooks/
```

**The rule that keeps this clean:** `src/lib/*` holds pure functions and types with no I/O and no React. Points calculation, validation, markdown rendering, tier thresholds. This means the same module can be imported by a Server Component, a Client Component, an action, and a test — and it is where the business rules become readable in one place.

`'use server'` files can only export **async functions**. Types and constants must live in `lib/`, or every consumer ends up importing a server module for a type.

---

## 8. Environment variables

```bash
# Firebase — client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=        # web push; push is inert without it

# Firebase — server
FIREBASE_API_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=            # quoted, with literal \n escapes

# Session cookies
AUTH_COOKIE_NAME=
AUTH_COOKIE_SIGNATURE_KEY_CURRENT=
AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS=
USE_SECURE_COOKIES=true                # false locally

# Misc
NEXT_PUBLIC_SITE_URL=
NOMINATIM_CONTACT=                     # required by OSM usage policy
EMAIL_HOST= / EMAIL= / EMAIL_PASSWORD=
```

`FIREBASE_ADMIN_PRIVATE_KEY` is stored on one line with literal `\n` and unescaped at load:

```ts
privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
```

⚠️ **Never echo this value.** It is a full credential to your project. If it leaks into a log, a terminal, or a chat transcript, rotate it in Google Cloud → IAM → Service Accounts → Keys.

---

## 9. Patterns worth lifting

### Optimistic UI with server reconciliation

```tsx
const [state, setState] = useState(initial);
const [busy, startTransition] = useTransition();

const toggle = () => {
  const previous = state;
  setState(optimistic(state));           // instant
  startTransition(async () => {
    const res = await action();
    if (!res.success || !res.data) { setState(previous); toast.error(res.message); return; }
    setState(res.data);                  // server is the truth
  });
};
```

The button is `disabled={busy}`, so a double-tap can't race.

### Reload *before* releasing the button

```ts
const res = await mutate();
await refresh();      // ← await, not fire-and-forget
setBusy(null);
toast.success(res.message);
```

Firing `refresh()` without awaiting means the button goes idle and the success toast appears while the rest of the page still shows the old state. It catches up a second later, or on the *next* save. Users read that as "the save did nothing."

### Tabs that survive same-page deep links

```tsx
const searchParams = useSearchParams();
const fromUrl = parse(searchParams.get("tab"));
const [tab, setTabState] = useState(fromUrl);
useEffect(() => { setTabState(fromUrl) }, [fromUrl]);   // follow the URL

const setTab = (next) => {
  setTabState(next);                                     // switch instantly
  window.history.replaceState(null, "", `${pathname}?tab=${next}`);
};
```

`useState(searchParams.get(...))` alone reads the URL **once, at mount**. A link from the same page changes the URL without remounting, so nothing happens. And `router.replace` on a dynamic route round-trips to the server — ~2s of lag for content already on the client.

### Hidden, not deleted, for moderation

Moderator actions set a status and write to an append-only audit log. Reversible, attributable, and the author still sees their own hidden content — otherwise they just post it again.

### Server-side identity on user content

Never trust a client-supplied author name or org id. Read it from the session:

```ts
const uid = await currentUid();
const profile = await authorProfile(uid);   // server read
await db.collection("comments").add({ authorId: uid, authorName: profile.name, ... });
```

### Third-party API proxying

Wrap external APIs (geocoding, etc.) in your own route so you can add: an identifying User-Agent, a serialised rate limit, a response cache, per-IP throttling, and request coalescing. Never call a rate-limited public API straight from the browser — you're billing the whole user base against one quota.

---

## 10. Traps that cost real time

| Trap | Symptom | Fix |
|---|---|---|
| `Number(null) === 0` | Silently geocoded to Null Island (0,0) | Reject `null`/`""` explicitly before `Number()` |
| Error responses lack expected keys | `data.address.suburb` throws inside a bare `catch`, saving garbage | Guard field-by-field; never `catch {}` around parsing |
| Dynamic Tailwind classes | Style silently absent | Literal lookup map |
| `cache()` export in `'use server'` | Build failure | Keep memoised readers private; export plain async wrappers |
| JSX comment right after `return (` | Build failure | `//` comment above the `return` |
| Owner-only update rules | Breaks legitimate cross-user field writes (e.g. view counts) | `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views'])` |
| CDN assets in an installable PWA | Broken offline / blocked by CSP | Bundle CSS and marker images locally |
| Reading `navigator` during render | Hydration mismatch | Decide in `useEffect`, default `false` |
| Boundary mismatch (`< 8MB` vs `<= 8MB`) | Picker accepts what the rules reject | Make both inclusive, from one shared constant |
| Two surfaces, two formulas | Same entity shows different numbers on different pages | One scoring function, imported by both |

---

## 11. What I'd change on the next project

- **Next.js 15 + React 19** for a greenfield build. 14.2.4 is stable and fine; there is no reason to start there now.
- **Zod over Yup** — better TypeScript inference, and it can validate Server Action inputs and API payloads with the same schema.
- **React Hook Form over Formik** — Formik is effectively unmaintained; RHF re-renders far less.
- **Reconsider Firestore** if the data is relational. Postgres + Drizzle/Prisma on Supabase or Neon gives joins, real constraints, and migrations. Firestore earns its place when you want realtime and zero ops.
- **Add tests.** This stack has none, and the pure logic in `lib/` is the easiest, highest-value place to start (Vitest). Everything derived — scoring, validation, tier thresholds — is a pure function with obvious cases.
- **Rate-limit Server Actions.** They are public HTTP endpoints; being typed doesn't stop anyone POSTing to them.
- **Set up an error tracker on day one** (Sentry). Server Action failures otherwise surface only as a toast the user sees and you never do.

---

## 12. New project checklist

1. `npx create-next-app@latest --typescript --tailwind --app --src-dir`
2. Create the Firebase project; enable Auth, Firestore, Storage
3. Generate a service account key → env vars (never commit, never echo)
4. `npm i firebase firebase-admin next-firebase-auth-edge`
5. Write `middleware.ts` + `firebase/config/server-config.ts` (see §4)
6. **Write `firestore.rules` denying everything, before the first feature**
7. `npx shadcn@latest init` for the primitives
8. Define the design tokens in `globals.css` + `tailwind.config.ts` — before building screens
9. Create `src/app/app/actions/` and the `ResponseData<T>` envelope
10. Add a rules deploy script (validate → release) and run it in CI
11. Add Sentry and a `lib/` test setup while the codebase is still small

---

## 13. Commands

```bash
npm run dev        # dev server
npm run build      # production build — run before every push
npm run start      # serve the production build locally
npm run lint       # eslint
npx tsc --noEmit   # typecheck (not part of build output)
```

Run `npm run build` **and** `npx tsc --noEmit` before pushing. `next build` will not catch every type error on its own, and a Server Component that only fails at request time will build clean and 500 in production.
