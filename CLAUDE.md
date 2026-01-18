# MyPKU - AI-Powered Personalized Diet Management App

## Project Overview
MyPKU is an AI-powered personalized diet management app specifically designed for PKU (Phenylketonuria) patients. Starting from rare disease specialization, it aims to expand into a universal diet management platform.

- **Target Users**: PKU patients (primary), general health-conscious users (secondary)
- **Core Differentiator**: Multimodal LLM Vision + Rare Disease Specialization + Hyper-personalized Coaching
- **Service Language**: English (Global audience)
- **Development Communication**: Korean (한국어로 대화)

### Project Timeline
- **Phase 0**: Gemini 3 Hackathon MVP (Due: February 9, 2026)
- **Phase 1**: Production-level web service (2026 Q2)
- **Phase 2-5**: Mobile app + Platform expansion (2026 Q3-Q4)

---

## Tech Stack

```
Frontend:
├── Next.js 15.3.8 (App Router)
├── React 19
├── TypeScript 5.7.3
├── Tailwind CSS 3.4
└── recharts 2.15 (charts)

Backend:
├── Next.js API Routes
├── Supabase (Auth + PostgreSQL + Storage)
└── Gemini API (@google/generative-ai)

State Management: Zustand 5.x (with localStorage persist for settings)
Deployment: Vercel
```

---

## Development Commands

```bash
# Package manager: bun
bun dev          # Development server (localhost:3000)
bun build        # Production build
bun lint         # ESLint check
bun start        # Start production server
```

---

## Docker Development Environment

For isolated development with `--dangerously-skip-permissions`:

```bash
docker-compose up -d               # Start container
docker-compose exec mypku-dev bash # Enter container
claude --dangerously-skip-permissions  # Run Claude Code
bun dev                            # Start dev server inside container
```

---

## Project Structure

```
app/                    # Next.js App Router pages
├── api/                # API Routes (server-side)
│   ├── analyze/        # Gemini Vision API (food analysis)
│   └── coaching/       # AI coaching message generation
├── auth/               # Authentication pages
│   ├── login/          # Login page with Google SSO
│   ├── callback/       # OAuth callback handler
│   └── error/          # Auth error page
├── analyze/            # Food photo analysis page
├── history/            # Meal history page
├── settings/           # User settings page
└── layout.tsx          # Root layout

components/
├── pages/              # Page-specific client components
│   ├── HomeClient.tsx
│   ├── AnalyzeClient.tsx
│   ├── HistoryClient.tsx
│   └── SettingsClient.tsx
├── dashboard/          # Dashboard components
│   ├── NutrientRing.tsx    # Circular progress
│   ├── DailyGoalCard.tsx   # Daily goal display
│   ├── WeeklyChart.tsx     # Weekly stats chart
│   └── CoachingMessage.tsx # AI coaching
├── analyze/            # Food analysis components
│   ├── ImageUploader.tsx
│   ├── AnalysisResult.tsx
│   └── FoodItemCard.tsx
├── common/             # Shared components
│   ├── Disclaimer.tsx  # Medical disclaimer (required!)
│   ├── Toast.tsx       # Toast notifications
│   ├── ErrorBoundary.tsx
│   └── Providers.tsx   # Context providers
└── ui/                 # Base UI components

hooks/
├── useNutritionStore.ts  # Zustand store for nutrition data
├── useAuth.ts            # Supabase authentication hook
├── useMealRecords.ts     # Meal records CRUD operations
└── useToast.ts           # Toast notification hook

lib/
├── gemini.ts             # Gemini API client (server-side only!)
├── prompts.ts            # Two-stage prompt templates
└── supabase/
    ├── client.ts         # Browser Supabase client
    ├── server.ts         # Server Supabase client
    ├── middleware.ts     # Auth middleware helpers
    ├── storage.ts        # Image storage utilities
    └── types.ts          # Database types

types/
└── nutrition.ts          # TypeScript type definitions
```

---

## Environment Variables

```env
# Gemini AI (Server-side ONLY - never expose to client!)
GEMINI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/api/analyze/route.ts` | Gemini Vision API calls for food analysis |
| `app/api/coaching/route.ts` | AI coaching message generation |
| `hooks/useNutritionStore.ts` | Central state management for nutrition data |
| `hooks/useAuth.ts` | Supabase authentication hook |
| `hooks/useMealRecords.ts` | Meal records CRUD with Supabase |
| `lib/gemini.ts` | Gemini API client configuration |
| `lib/prompts.ts` | Two-stage prompt engineering templates |
| `components/common/Disclaimer.tsx` | Medical disclaimer component |

---

## Important Development Rules

### 1. API Key Security
- **NEVER** expose `GEMINI_API_KEY` to client-side code
- All Gemini API calls must go through API Routes (`app/api/`)
- Use `NEXT_PUBLIC_` prefix only for public Supabase keys

### 2. Client Components
- Add `"use client"` directive at the top of client components
- Page components in `app/` are server components by default
- Client-side logic goes in `components/pages/*Client.tsx`

### 3. Dual Mode UI (PKU vs General)
- PKU Mode: Focus on phenylalanine (mg) tracking
- General Mode: Focus on calories tracking
- Both modes track: calories, protein, carbs, fat
- Handle mode branching in dashboard and analysis components

### 4. Medical Disclaimer (Required!)
- Display `<Disclaimer />` component on all pages
- Never provide medical diagnosis or treatment advice
- AI analysis results are estimates, not medical facts
- Phenylalanine calculation formula: `protein_g × 50mg`

### 5. Language Convention
- **App UI/Content**: English (for global users)
- **Development Communication**: Korean (한국어로 Claude와 대화)

### 6. Error Handling
- Use Exponential Backoff for API retries
- Show user-friendly error messages
- Log errors for debugging but don't expose internals

---

## Current Status

### Completed (MVP)
- [x] AI food analysis with Gemini 2.0 Flash
- [x] Dual mode UI (PKU/General)
- [x] Daily dashboard with nutrient visualization
- [x] Meal records & history
- [x] AI coaching messages
- [x] Supabase Auth integration (Google SSO)
- [x] Database schema setup

### In Progress (Phase 1)
- [ ] Image storage integration (Supabase Storage)
- [ ] Vercel deployment environment variables
- [ ] Production error handling

### Pending (Phase 2+)
- [ ] 식약처 (MFDS) API integration
- [ ] PKU special foods database
- [ ] Mobile app (Capacitor)
- [ ] Push notifications

---

## Database Schema (Supabase)

```sql
-- Main tables
profiles          -- User profiles (linked to auth.users)
daily_goals       -- User's daily nutrition goals
meal_records      -- Individual meal entries
food_items        -- Food items within meals

-- All tables have RLS (Row Level Security) enabled
-- Users can only access their own data
```

---

## Testing Checklist

1. **Food Analysis**
   - Test with various food photos
   - Verify PKU/General mode calculations
   - Check confidence scores

2. **Authentication**
   - Google SSO login flow
   - Session persistence
   - Logout functionality

3. **Data Persistence**
   - Meal records save to Supabase
   - History displays correctly
   - Mode settings persist

4. **Responsive Design**
   - Mobile viewport (375px+)
   - Desktop viewport (1024px+)
   - Touch interactions work
