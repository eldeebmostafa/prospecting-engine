# Prospecting Engine — CLAUDE.md

Internal context for Claude Code sessions. Everything a future session needs to understand, navigate, and extend this codebase without re-deriving history.

---

## Project Overview

**What it does:** A B2B lead prospecting tool that searches Google Maps and the web for businesses matching a query (country + city + business type), merges the results, deduplicates them against an existing Google Sheet of known leads, and runs every result through an OpenAI model for qualification scoring.

**Who it's for:** A sales/prospecting team targeting specific countries and business categories (e.g. used car dealers in Libya, auto parts suppliers in Tunisia). Primary language of use is Arabic; the UI supports RTL text via `dir="auto"` attributes.

**Output:** A scored list of leads (High / Medium / Low / Reject) with phone, address, website, source, AI reason, duplicate flag, and social links. Leads can be exported to Google Sheets or downloaded as a styled Excel file.

---

## Live URLs

| Service   | URL |
|-----------|-----|
| Frontend  | Deployed on Vercel — check `client/.vercel/project.json` for project ID (`prj_0pbAT63br4xYgtzrGZJBkVtqcJmc`) |
| Backend   | Deployed on Render as `prospecting-engine-api` (see `render.yaml`) |
| GitHub    | https://github.com/eldeebmostafa/prospecting-engine |

The Vercel project is linked inside `client/` (not the repo root). When the Vercel CLI is used, run it from `client/`.

---

## How to Run Locally

```bash
# From the repo root — starts both client (Vite) and server (Express) concurrently
npm run dev
```

- Client runs on `http://localhost:5173`
- Server runs on `http://localhost:3001`
- Vite proxies all `/api/*` requests to `localhost:3001` — no CORS issues in dev
- Env vars are loaded from `.env` at the repo root (server reads `../env` relative to `server/`)

---

## Folder Structure

```
prospecting-engine/
├── package.json              Root — only "dev" script using concurrently
├── .env                      All secrets (never committed)
├── .env.example              Template for required env vars
├── render.yaml               Render deploy config for the backend service
│
├── client/                   React frontend (Vite + Tailwind v4)
│   ├── .vercel/              Vercel project linkage (projectId, orgId)
│   ├── vite.config.js        Dev proxy: /api → localhost:3001
│   ├── src/
│   │   ├── main.jsx          React entry point
│   │   ├── App.jsx           Root component — holds all state, fetch logic, Excel export
│   │   ├── index.css         Global styles + Tailwind imports
│   │   ├── data/
│   │   │   └── countries.js  Static array of country name strings for the combobox
│   │   └── components/
│   │       ├── SearchForm.jsx     Left panel — all form inputs, Search button, loading steps
│   │       ├── CountryCombobox.jsx Typeahead combobox (not a native select) for country
│   │       ├── ResultsTable.jsx   Right panel — table, toolbar, score/source badges, social icons
│   │       └── Toast.jsx          Ephemeral notification overlay (auto-dismisses at 4.5s)
│
└── server/                   Express backend (ESM, Node 18+)
    ├── index.js              App entry — Express setup, CORS, route mounting
    ├── routes/
    │   ├── qualify.js        POST /api/qualify — main pipeline (maps + web + AI + dedup)
    │   ├── maps.js           POST /api/search/maps — standalone Maps search (dev/debug)
    │   ├── web.js            POST /api/search/web  — standalone Brave search (dev/debug)
    │   └── sheet.js          GET /api/sheet/check, POST /api/sheet/export
    └── services/
        ├── mapsSearch.js     Google Places Text Search + Place Details (phone fetch)
        ├── webSearch.js      Brave Search API — web results + social link extraction
        ├── sheetCheck.js     Read existing leads from Google Sheet for dedup
        ├── sheetExport.js    Append new leads to Google Sheet (auto-creates header row)
        └── sheetsClient.js   Singleton Google Sheets API client (service account auth)
```

---

## Tech Stack

### Frontend
- **React 19** with hooks — no router, single-page app
- **Vite 8** — dev server with API proxy, production build
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin (no `tailwind.config.js` needed)
- **xlsx (SheetJS)** — client-side Excel file generation with cell styling

### Backend
- **Express 5** (ESM modules) — `"type": "module"` in `server/package.json`
- **node-fetch** — HTTP client for external APIs
- **openai** SDK — GPT-4o-mini qualification
- **googleapis** — Google Sheets API v4 (service account auth)
- **string-similarity** — Dice coefficient fuzzy matching for dedup
- **dotenv** — env loading in dev only (`NODE_ENV !== 'production'` guard)

### External APIs
| API | Used For | Env Var |
|-----|----------|---------|
| Google Places Text Search | Business search by name/location | `GOOGLE_PLACES_API_KEY` |
| Google Places Details | Fetch phone number per place | `GOOGLE_PLACES_API_KEY` (same key) |
| Brave Search API | Web results + social link discovery | `BRAVE_SEARCH_API_KEY` |
| OpenAI Chat Completions | Lead qualification scoring | `OPENAI_API_KEY` |
| Google Sheets API v4 | Dedup check + lead export | `GOOGLE_SERVICE_ACCOUNT_JSON` |

---

## Environment Variables

All vars live in `.env` at the repo root. The server reads them; the client only reads `VITE_API_URL`.

| Variable | Required | Description |
|----------|----------|-------------|
| `BRAVE_SEARCH_API_KEY` | Yes | Brave Search API token — used in `webSearch.js` |
| `GOOGLE_PLACES_API_KEY` | Yes | Google Cloud API key with Places API enabled — used in `mapsSearch.js` |
| `OPENAI_API_KEY` | Yes | OpenAI secret key — used in `qualify.js` |
| `OPENAI_MODEL` | No | OpenAI model name, defaults to `gpt-4o-mini` |
| `GOOGLE_SHEETS_ID` | Yes | The spreadsheet ID from the Google Sheet URL — used in `sheetCheck.js` and `sheetExport.js` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Full JSON of the GCP service account credentials, as a single-line string — used in `sheetsClient.js`. The service account must have Editor access to the sheet. |
| `PORT` | No | Server listen port, defaults to `3001`. Render sets this to `10000`. |
| `FRONTEND_URL` | Production only | Set in Render dashboard to the Vercel deployment URL. Used by the CORS allowlist in `server/index.js`. In dev, CORS allows all origins. |
| `VITE_API_URL` | Production only | Set in Vercel env settings to the Render backend URL. In dev this is empty and Vite's proxy handles `/api/*`. |

---

## API Endpoints

### `POST /api/qualify` — Main pipeline

**Request body:**
```json
{
  "country": "Libya",
  "city": "Tripoli",
  "businessType": "قطع غيار",
  "language": "ar",
  "limit": 20,
  "criteria": "B2B car parts supplier who imports..."
}
```
- `city` is optional — city-less searches query the whole country
- `language` is passed to the frontend only (not currently used server-side to filter results)
- `criteria` is required — used verbatim in the AI prompt

**Response:**
```json
{
  "count": 18,
  "socialLinks": {
    "facebook": ["https://facebook.com/..."],
    "instagram": null,
    "tiktok": null
  },
  "results": [
    {
      "name": "...", "phone": "...", "address": "...", "website": "...",
      "source": "maps|web|both",
      "rating": 4.2, "reviewCount": 31, "placeId": "...",
      "description": "...",
      "score": "High|Medium|Low|Reject",
      "reason": "One sentence explanation",
      "whatsappDetected": true,
      "duplicate": false
    }
  ]
}
```

`socialLinks` is at the **search level**, not per-row — it comes from a separate Brave social query against the business type + country, not from individual result pages.

### `POST /api/sheet/export`

**Request body:**
```json
{
  "leads": [ /* array of lead objects from /api/qualify */ ],
  "meta": { "country": "...", "city": "...", "businessType": "..." }
}
```
**Response:** `{ "success": true, "rowsAdded": 5 }`

Auto-creates a header row if the sheet is empty. Appends otherwise.

### `GET /api/sheet/check`
Returns `{ phones: [...], names: [...] }` from the sheet (columns A and C). Used internally; not called from the frontend.

### `POST /api/search/maps` / `POST /api/search/web`
Standalone routes for testing individual services. Same request shape as `/api/qualify` minus `criteria`. Not used by the frontend.

---

## Architecture & Key Decisions

### Pipeline in `qualify.js`
1. `searchMaps`, `searchWeb`, and `getSheetLeads` run in **parallel** via `Promise.allSettled` — any one failing doesn't abort the search.
2. Maps and web results are **merged** by phone (exact, normalized) then by name (Dice > 0.85). Merged leads get `source: "both"`; unmatched web leads are appended.
3. AI qualification runs in **batches of 10**. `gpt-4o-mini` silently truncates the JSON output when given 20+ leads in a single prompt, causing parse failures. Batch size 10 is the safe limit.
4. Duplicate detection uses the **same `normalizePhone` function** imported from `sheetCheck.js` — this ensures that phones normalized at check-time match phones normalized at export-time. Never duplicate the normalization logic.

### Phone normalization (`sheetCheck.js:normalizePhone`)
Strips spaces, dashes, parentheses, dots, plus signs, and leading zeros. Minimum 7 digits. Shared import in `qualify.js` — do not re-implement inline.

### Social links architecture
`socialLinks` is extracted from a **separate Brave query** (`site:facebook.com OR site:instagram.com OR site:tiktok.com`) run alongside the main web query. It is returned at the top level of the API response, not attached to individual leads. The `ResultsTable` passes the same `socialLinks` object to every row — all rows show the same social icons. This is intentional: social pages represent the business type in that country, not individual leads.

### Google Sheets client (`sheetsClient.js`)
Singleton pattern — the client is instantiated once and cached in `_client`. `GOOGLE_SERVICE_ACCOUNT_JSON` must be valid JSON; Render stores it as a secret env var (the full service account JSON as a single escaped string).

### CORS
In dev: `cors({ origin: true })` — all origins allowed.  
In production: `cors({ origin: [process.env.FRONTEND_URL] })` — only the Vercel URL.  
`FRONTEND_URL` must be set in the Render dashboard.

### Client-side API URL
`const API = import.meta.env.VITE_API_URL ?? ''`  
Empty string in dev (Vite proxy handles it). Set to the Render URL in Vercel's production env vars.

---

## Known Quirks & Bugs Fixed

### Brave: no quoted queries for Arabic
Brave's Arabic index is too sparse for exact-phrase queries (`"قطع غيار"`). Quoted queries return zero results. The web query is built as an unquoted string: `` `${businessType} ${city} ${country}` ``. This is intentional — do not add quotes.

### gpt-4o-mini truncation at batch size > 10
When the AI prompt contains more than ~10 leads, gpt-4o-mini truncates its JSON output mid-array, causing a parse error. Batch size is hard-capped at 10 in `qualify.js`. Do not raise this without testing with 20+ leads.

### Social links were per-row (fixed)
Early implementation attached social links to individual lead rows. This caused the wrong data structure on export and confused the UI. Social links are now extracted once at the search level and stored in `searchMeta` / returned at the top of the API response.

### `city` required on backend but optional in UI (fixed, commit `dce2466`)
`qualify.js` originally required `city` in its validation check. The UI marks city as optional (no asterisk). Users who left city blank hit a confusing 400 error. Fixed by removing `city` from the required check — city-less searches work fine, querying the whole country.

### Excel `Exported At` was a full ISO timestamp (fixed)
Initial export wrote `new Date().toISOString()` (full timestamp with time). Fixed to `.slice(0, 10)` for a clean `YYYY-MM-DD` date in the sheet and Excel file.

### `Is Importer` field removed
An "Is Importer" field was in the AI prompt and exports. It was removed as it cluttered the output and the AI couldn't reliably detect it.

---

## UI Behavior Notes

- **`CountryCombobox`** is a custom typeahead, not a native `<select>`. It maintains its own `query` state for filtering. The actual `form.country` value only updates when the user clicks a dropdown item — typing alone does not update it.
- **Rejected leads** are hidden by default. The "Show Rejected" toggle in the toolbar reveals them at 50% opacity.
- **`_id`** is a synthetic index stamped on each result in `App.jsx` after fetch — used for checkbox tracking. It is stripped before export.
- **Loading steps** advance every 6 seconds client-side (`STEP_INTERVAL = 6000`) as a visual indicator — they don't reflect actual server progress.
- **Excel export** uses `xlsx` with cell-level styling: navy header row, color-coded data rows by AI score (green/orange/yellow/red). Auto-width columns capped at 60 chars.

---

## Future Features Planned

- **Daily schedule** — run searches on a cron, auto-export new leads to the sheet
- **WhatsApp trigger** — send a WhatsApp message to High-scored leads automatically after qualifying
- **Bitrix24 push** — push qualified leads directly into the CRM as contacts or deals
- **Saved templates** — save and reuse search configurations (country + business type + criteria combos)
