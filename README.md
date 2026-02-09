# MyPKU

AI-powered diet management for PKU patients. Analyze meals through photos, live video conversation, voice, and barcode scanning to track daily phenylalanine intake.

Built with Gemini 3 and Gemini Live API for the [Google Gemini API Developer Competition](https://gemini3.devpost.com/).

## What is PKU?

Phenylketonuria (PKU) is a genetic metabolic disorder where the body can't break down phenylalanine (Phe), an amino acid in most proteins. Patients must limit Phe to 200-500mg per day for life. To put that in perspective, a single egg contains about 330mg. Going over causes neurological damage.

Most PKU families track Phe manually with paper charts and memorized food lists. MyPKU replaces that with AI-powered meal analysis that gives Phe estimates in seconds.

## How We Use Gemini

MyPKU uses 6 Gemini API capabilities across 5 endpoints:

**Live Meal Analysis** (`gemini-2.5-flash-native-audio-preview`)
- Real-time video + audio over WebSocket. Patient shows food on camera and talks about portions.
- Function Calling (`log_pku_food_analysis`) extracts structured `FoodItem[]` mid-conversation.
- Ephemeral auth tokens issued server-side. API key never reaches the browser.

**Photo Analysis** (`gemini-3-flash-preview`)
- Thinking Level: `HIGH` for multi-item Phe estimation with reasoning chains.
- Google Search Grounding to look up Phe values for regional and brand-specific foods.
- Structured Output (`responseJsonSchema`) guarantees valid JSON with `phe_mg`, `pku_safety`, `exchanges`.
- Media Resolution: `HIGH` to catch ingredient details that affect Phe (sesame seeds, sauce, garnish).

**Text/Voice Analysis** (`gemini-3-flash-preview`)
- Same Thinking HIGH + Search Grounding + Structured Output pipeline as photo analysis.
- Accepts natural language food descriptions ("200g bibimbap without egg").

**Barcode OCR** (`gemini-3-flash-preview`)
- Thinking Level: `LOW` for fast digit extraction.
- Media Resolution: `MEDIUM` (sufficient for printed barcodes).
- Fallback when zxing-wasm can't read damaged or curved labels.

**Diagnosis OCR** (`gemini-3-flash-preview`)
- Extracts Phe limits and dietary parameters from photographed PKU diagnosis letters.
- Thinking Level: `HIGH` + Structured Output for clinical data accuracy.
- Letters vary by country and clinic, so deep reasoning is needed to find the right values.

**AI Coaching** (`gemini-3-flash-preview`)
- Thinking Level: `LOW` for concise responses.
- Generates personalized weekly feedback based on intake patterns.
- Multilingual output (EN/KO/RU) via prompt engineering.

## Features

### Input Methods
- **Photo Analysis**: Snap a meal photo for instant Phe breakdown
- **Live Conversation**: Show food on camera, talk through portions with Gemini
- **Voice Input**: Describe what you ate, get Phe estimates
- **Barcode Scan**: Client-side scanning (zxing-wasm) with Gemini OCR fallback
- **Food Search**: Query USDA FoodData Central and Korean MFDS databases
- **Diagnosis OCR**: Photograph a diagnosis letter to auto-configure Phe limits

### Tracking
- **Phe Dashboard**: Color-coded daily progress (green/yellow/red)
- **Exchange Calculator**: mg to exchange units (1 exchange = 50mg Phe)
- **Formula Tracking**: Medical formula intake with time slots and reminders
- **Blood Level History**: Phe blood test trends with test reminders
- **Weekly Insights**: Pattern detection, goal hit rates, AI coaching tips
- **Reports**: Exportable summaries for clinic visits

### Collaboration
- **Caregiver Mode**: Parents link to child's account with granular permissions (view intake, blood levels, alerts). Invite/accept flow with RLS enforcement.
- **PKU Recipes**: Recipe database with per-serving Phe calculations
- **Multilingual**: English, Korean, Russian with region-specific PKU terminology

### Infrastructure
- **PWA**: Installable, works offline with cached food database (90-day TTL)
- **Guest Mode**: Full functionality without sign-up (localStorage)
- **Cloud Sync**: Google OAuth login syncs data across devices via Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Gemini 3 (`gemini-3-flash-preview`), Gemini Live API (`native-audio-preview`) |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Supabase (Auth, PostgreSQL, RLS, Storage) |
| State | Zustand 5 with localStorage persistence |
| PWA | Serwist (runtime caching, offline fallback) |
| i18n | next-intl (EN, KO, RU) |
| Food Data | USDA FoodData Central, Korean MFDS API |
| Scanning | zxing-wasm (client-side), Gemini OCR (fallback) |
| Testing | Vitest, Testing Library |
| Deployment | Vercel |

## Architecture

```
Client (PWA)
│
├─ Photo ──┐
├─ Voice ──┤
├─ Live  ──┤──→ API Routes ──→ Gemini 3 / Live API ──→ FoodItem[]
├─ Scan  ──┤        │                                      │
├─ OCR   ──┘        │                                      ▼
│                    │                              Zustand Store
│                    │                          ┌──────────┴──────────┐
│                    │                     Guest Mode            Cloud Sync
│                    │                   (localStorage)         (Supabase)
│                    │
│                    └──→ USDA / Korean MFDS APIs ──→ PKU Food Cache
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)
- [Supabase](https://supabase.com/) project
- [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/3000-2/mypku.git
cd mypku
bun install
cp .env.example .env
```

Fill in `.env`:

```
GEMINI_API_KEY=                    # Required
NEXT_PUBLIC_SUPABASE_URL=          # Required
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Required
FOOD_SAFETY_KOREA_API_KEY=         # Optional — Korean food database
USDA_FDC_API_KEY=                  # Optional — USDA food database
```

### Run

```bash
bun dev          # Dev server at localhost:3000
bun build        # Production build
bun lint         # ESLint
bun test:run     # Run tests
```

## Disclaimer

MyPKU is a decision-support tool, not a medical device. AI analysis results are estimates. Always consult your doctor or metabolic dietitian for medical decisions.
