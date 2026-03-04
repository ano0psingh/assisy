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
   Opens at [http://localhost:5173](http://localhost:5173)

3. **Build for production**
   ```bash
   npm run build
   ```
   Output is in `dist/`

4. **Preview production build**
   ```bash
   npm run preview
   ```

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
npx vercel deploy --yes
```

For each update, run the deploy command again from your local machine. Vercel will build and deploy the latest code.

---

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Local Storage (no backend)
