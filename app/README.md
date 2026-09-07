# Assisy

A productivity and task management app built with React, TypeScript, and Vite.

## Build Locally

### Prerequisites

- Node.js (v18+)
- npm

### Steps

1. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```
   Opens at [http://localhost:3000](http://localhost:3000)

3. **Build for production**
   ```bash
   npm run build
   ```
   Output is in `dist/`

4. **Preview production build**
   ```bash
   npm run preview
   ```

## Quality gates

Install the CI browser once, then run the complete local gate:

```bash
npx playwright install chromium
npm run test:quality
```

Useful focused commands are `npm run check:sync-multiclient`,
`npm run test:e2e`, and `npm run test:a11y`. Browser tests build against the
local production preview, seed localStorage only, and block API/Supabase calls.
They cover desktop and mobile Chromium, light/dark core routes, keyboard dialog
focus, non-drag alternatives, 48px mobile capture, reduced motion/transparency,
and axe-core WCAG 2.2 AA rules.

The automated axe gate blocks serious and critical violations. Moderate and
minor findings remain visible in axe results but are not CI-blocking because
several legacy routes still use low-emphasis secondary text; no individual axe
rule is disabled.

CI runs `npm run lint:quality` over the sync and browser-gate implementation.
The existing repository-wide `npm run lint` remains available, but currently
reports legacy React hook-rule findings outside this quality-gate change.

## Deploy to Vercel

**Live URL:** [https://app-seven-lilac-81.vercel.app](https://app-seven-lilac-81.vercel.app)

### First-time setup

1. **Log in to Vercel**
   ```bash
   cd app
   npx vercel login
   ```
   Follow the prompts to authenticate.

### Deploy

```bash
cd app
npx vercel deploy --prod --yes
```

For each update, run the deploy command again from your local machine. Use `--prod` to deploy to production; omit it for preview deployments.

---

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Local Storage (no backend)
