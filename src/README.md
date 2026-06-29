# Agentic Mainstream Meter

A public, evidence-backed dashboard tracking whether AI agents are crossing into mainstream adoption. Not a black box — every signal lane is transparent, labeled, and sourced.

## What it measures

| Lane | Source | What it proxies |
|------|--------|-----------------|
| Wikipedia pageviews | Wikimedia Analytics API (free, official) | Public curiosity / information-seeking |
| Google Trends | Apify scraper (free tier) | Search momentum / demand |
| Job postings | Apify ZipRecruiter scraper (free tier) | Employer demand / enterprise commitment |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/agentic-mainstream-meter
cd agentic-mainstream-meter
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
APIFY_TOKEN=your_token_here
```

**Getting your keys:**
- **Anthropic** → https://console.anthropic.com → API Keys
- **Apify** → https://apify.com (free signup) → Settings → Integrations → API token

Wikipedia lane requires no key — it uses the official free Wikimedia API.

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Import repo at https://vercel.com/new
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `APIFY_TOKEN`
4. Deploy

## Tuning the score

All scoring logic lives in `src/lib/scoring.ts`. Key things to adjust:

```ts
// Lane weights (must sum to 1.0)
export const LANE_WEIGHTS = {
  wikipedia: 0.35,
  trends: 0.35,
  jobs: 0.30,
}

// Baselines — adjust these as real data accumulates
const WIKI_BASELINE = 2_000_000   // monthly pageviews = score of 50
const TRENDS_BASELINE = 40         // average interest/100 = score of 50
const JOBS_BASELINE = 5_000        // monthly postings = score of 50
```

## Extending signal lanes

Each lane is an isolated module in `src/lib/lanes/`. To add a new lane:

1. Create `src/lib/lanes/your-lane.ts` — export `fetchYourLane(): Promise<LaneResult>`
2. Add it to `src/app/page.tsx` in the `Promise.all` block
3. Add its weight to `LANE_WEIGHTS` in `scoring.ts`
4. Add its metadata to `LANE_META` in `Dashboard.tsx`

## Adding the paid tier (CLAWDGate)

The gate is stubbed in `src/lib/gate.ts`. When ready:

1. Set env vars (see `.env.example`)
2. Install wagmi + RainbowKit
3. Replace `checkGateStatus()` with real balance check against `CLAWD_TOKEN_ADDRESS` on Base (chainId 8453)

No other files need to change — the rest of the app reads from `GateStatus.isUnlocked`.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── score/route.ts      ← composite score endpoint
│   │   ├── wikipedia/route.ts  ← individual lane endpoints
│   │   ├── trends/route.ts
│   │   └── jobs/route.ts
│   ├── page.tsx                ← server component, fetches + renders
│   └── globals.css
├── components/
│   └── Dashboard.tsx           ← full UI
├── lib/
│   ├── lanes/
│   │   ├── wikipedia.ts        ← Wikimedia API (free)
│   │   ├── trends.ts           ← Apify Google Trends
│   │   └── jobs.ts             ← Apify ZipRecruiter
│   ├── scoring.ts              ← weights, normalization, stage labels
│   ├── narrative.ts            ← Claude-powered plain-English summary
│   └── gate.ts                 ← CLAWDGate stub
└── types/index.ts
```
