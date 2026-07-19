# StoryForge 🪄

**AI-powered multi-agent interactive narrative generation**

A full-stack web app built on React + Supabase + OpenRouter. Players define characters & settings, then navigate branching AI-generated stories with full state tracking, guardrail enforcement, and visual story maps.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Tailwind CSS v4, shadcn/ui primitives |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase PostgreSQL + pgVector |
| Auth | Supabase Auth (email/password) |
| AI | OpenRouter API (`meta-llama/llama-3.2-3b-instruct:free`) |
| Hosting | Vercel / Netlify |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourname/storyforge
cd storyforge
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy the Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set OPENROUTER_API_KEY=your-openrouter-key

# Deploy
supabase functions deploy generate-scene
```

### 5. Run locally

```bash
npm run dev
```

---

## Features

### Step 1 — Project Setup
- Define story title, genre, tone, and setting
- Create characters with roles (protagonist / antagonist / supporting), traits, and backstory
- Configure AI guardrails (content rules enforced at generation time)

### Step 2 — Play
- AI generates the opening scene via Edge Function + OpenRouter Llama 3.2
- 2–4 narrative choices presented after each scene
- Live story state panel (plot threads, clues discovered)
- Guardrail violation warnings shown inline
- Loading states for every AI operation

### Step 3 — Review
- Interactive story map (React Flow flowchart of all scenes/branches)
- Linear timeline view
- Export to Markdown (`.md`) or structured JSON
- Story statistics (scenes, depth, endings, characters)

---

## Project Structure

```
storyforge/
├── src/
│   ├── components/
│   │   ├── AppShell.tsx          # Root layout + nav + step routing
│   │   ├── auth/AuthScreen.tsx   # Sign in / sign up
│   │   ├── setup/SetupStep.tsx   # 3-panel story setup wizard
│   │   ├── play/PlayStep.tsx     # Scene display + choices
│   │   ├── review/
│   │   │   ├── ReviewStep.tsx    # Stats + export
│   │   │   └── StoryMap.tsx      # React Flow visualization
│   │   └── ui/                   # Button, Card, Input, Textarea, Badge
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Supabase auth state
│   │   └── StoryContext.tsx      # Global story state (useReducer)
│   ├── services/
│   │   └── storyService.ts       # DB calls + Edge Function invocations
│   ├── types/
│   │   ├── story.ts              # Domain interfaces
│   │   └── database.ts           # Supabase table types
│   └── lib/
│       ├── supabase.ts           # Supabase client
│       └── utils.ts              # cn() helper
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── generate-scene/
│           └── index.ts          # Deno Edge Function
└── public/
    └── favicon.svg
```

---

## Supabase Free Tier Usage

| Resource | Limit | StoryForge Usage |
|----------|-------|-----------------|
| Database | 500 MB | ~1 KB/scene, ~50 KB/project |
| Edge Functions | 500K calls/month | 1 call/scene |
| Auth MAU | 50,000 | — |
| Storage | 1 GB | Exports only (optional) |
| Bandwidth | 5 GB/month | ~10 KB/API response |

---

## OpenRouter Free Models

The app defaults to `meta-llama/llama-3.2-3b-instruct:free`. You can swap the `MODEL` constant in `supabase/functions/generate-scene/index.ts` to any free model:

- `mistralai/mistral-7b-instruct:free`
- `google/gemma-2-9b-it:free`
- `meta-llama/llama-3.1-8b-instruct:free`

---

## License

MIT
