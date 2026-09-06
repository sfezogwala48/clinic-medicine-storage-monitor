# Clinic Medicine Storage Monitor

SPA dashboard for monitoring clinic medicine storage conditions (temperature,
humidity, container access), built with **TanStack Router** (SPA/file-router),
**shadcn/ui on Base UI primitives**, and **Tailwind CSS v4**.

## Getting Started

```bash
pnpm install
pnpm dev
```

```bash
pnpm build   # SPA production build (dist/)
pnpm preview # preview the production build
```

## Routing (SPA)

File-based routes in `src/routes` (no server functions, no SSR):

| Route       | Page                   |
| ----------- | ---------------------- |
| `/`         | Dashboard overview     |
| `/realtime` | Real-Time sensor view  |
| `/access`   | Container access log   |
| `/alerts`   | Alerts & notifications |
| `/reports`  | Reports & analytics    |
| `/settings` | Thresholds & config    |
| `/users`    | User management        |

The layout (sidebar, header, login gate, theme) lives in
`src/routes/__root.tsx`. The single router entry is `src/router.tsx`
(`getRouter()`), booted from `src/main.tsx`.

## shadcn/ui + Base UI + TanStack Router

- Primitives in `src/components/ui` are built on
  `@base-ui-components/react` (no Radix): polymorphism via the `render`
  prop, transitions via `data-open` / `data-closed` /
  `data-starting-style` / `data-ending-style`.
- Router-compatible wrappers:
  - `src/components/ui/router-button.tsx` — a real TanStack `Link` (`<a>`)
    styled with `buttonVariants`, so `to`/`params`/`search` stay type-safe
    with correct link semantics and preloading.
  - `src/components/ui/router-dialog.tsx`, `router-sheet.tsx` —
    controlled wrappers around the Base UI dialog primitives.
  - `src/components/navigation/main-nav.tsx` — nav menu with
    `useMatchRoute` active states.
  - `src/components/theme-provider.tsx` — class-based dark mode.
- Dialog/Sheet/overlay portals mount to `document.body`; a `#portal-root`
  node is reserved in the root layout.

Mock telemetry and users live in `src/data/clinic.ts` (values transcribed
from `reference/dashboard.html`).
