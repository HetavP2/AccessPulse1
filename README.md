# AccessPulse

AccessPulse is a standalone concept prototype for collecting and reviewing accessibility barriers reported by community members.

It turns a short written report (or pasted voice transcript) into a structured record: category, priority, summary, key issues, recommended action, follow-up flag, confidence, and missing information. A dashboard then summarises the reports held in the browser.

## What you can do

- Review live totals for reports, high-priority issues, locations, and follow-ups.
- See category breakdowns, locations with repeated reports, and community insights.
- Browse the five most recent reports or the full list, filtered by priority.
- Submit a report with a location, city, report type, and description.
- Open any report to see the original text and the full analysis.
- Mark a report as reviewed and toggle whether it needs follow-up.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) with React 19
- TypeScript
- Tailwind CSS v4
- Browser `localStorage` for persistence
- Optional OpenAI analysis through a server-side API route

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first load, the app seeds six synthetic reports. They are labelled **Synthetic demo data** and do not overwrite reports you have already created. Starter reports keep their precomputed rule-based analysis even when OpenAI is enabled; new submissions use the active analysis mode.

### Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

To check the production build:

```bash
npm run build
npm start
```

## How analysis works

New reports are sent to `POST /api/analyze` with the report description.

1. The server validates the description (at least 10 characters, capped at 4000).
2. If `OPENAI_API_KEY` is set, the server asks OpenAI (`gpt-4o-mini`) for the structured analysis.
3. If no key is configured, or the OpenAI request fails or returns an unexpected shape, the server falls back to the local rule-based classifier.
4. The browser also falls back to the local classifier if the API request itself fails, so a report can still be submitted during an API outage.

The analysis contains:

| Field | Meaning |
| --- | --- |
| `category` | Mobility, Visual Accessibility, Hearing Accessibility, Infrastructure, Signage and Navigation, or Other |
| `priority` | High, Medium, or Low |
| `summary` | A one-sentence summary drawn from the report |
| `key_issues` | Short list of the barriers described |
| `recommended_action` | Suggested next step |
| `requires_follow_up` | Whether the report should be followed up |
| `confidence` | Score from 0 to 1 |
| `missing_information` | Facts the report does not include |

The UI labels every analysis as either **AI analysis (OpenAI)** or **Rule-based demo analysis** so readers know how it was produced.

### Rule-based classifier

The local classifier in `lib/analysis.ts` uses keyword matching for categories and priorities, plus small phrase-based rules for issues and recommended actions. It is deterministic and needs no network access. It is not a language model, and its confidence score reflects how much rule evidence matched rather than semantic certainty.

## Environment variables

No environment variables are required. The app works fully with rule-based analysis.

Optional, in `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

Create `.env.local` from the provided `.env.example` template.

The key is read only by the server route `POST /api/analyze` and is never sent to the browser. Restart the development server after changing it. The app shows the active analysis mode on the dashboard.

## API

### `GET /api/analyze`

Reports which analysis mode the server is using.

```json
{ "mode": "rule-based" }
```

`mode` is `"openai"` when `OPENAI_API_KEY` is configured.

### `POST /api/analyze`

Request:

```json
{ "description": "The hearing loop at the front desk is broken." }
```

Response: the analysis fields above plus `source` (`"openai"` or `"rule-based"`).

Returns `400` when the body is not valid JSON or the description is shorter than 10 characters. Upstream OpenAI failures do not error the request; they return rule-based analysis instead.

## Data and privacy

- Reports, review status, and follow-up flags are stored in this browser under the `accesspulse.reports.v1` key.
- There is no account system, database, or shared inbox, so data is not synced between browsers or devices.
- Clearing site data resets the app to the six synthetic starter reports.
- If an OpenAI key is configured, report descriptions are sent to the OpenAI API for analysis. Without a key, report text is only sent to the app's own `/api/analyze` route, which runs the local classifier.

## Project structure

```text
app/
  api/analyze/route.ts   Server route for OpenAI or rule-based analysis
  layout.tsx             Root layout and metadata
  page.tsx               Renders the dashboard
  globals.css            Tailwind entry point and base styles
components/
  Dashboard.tsx          Overview, report list, filters, and client state
  ReportDetail.tsx       Report detail dialog and review actions
  ReportForm.tsx         Submit report dialog
  StatsCard.tsx          Dashboard statistic card
lib/
  analysis.ts            Rule-based classifier and analysis labels
  mockData.ts            Six synthetic starter reports
  stats.ts               Dashboard totals and community insights
  storage.ts             localStorage persistence and subscriptions
  types.ts               Shared report and analysis types
```

## Trying it out

1. Open **Overview** and note the four statistics, Community Insights, and five newest reports.
2. Open the Community Centre report to see the original text and its rule-based classification.
3. Mark it as reviewed and toggle follow-up. Close the dialog to see the badges and updated counts.
4. Click **Submit Report** and paste, for example:

   > The hearing loop at the front desk is broken, so audio announcements are hard to hear.

   Choose **Voice Transcript** and submit.
5. Show the new report and updated totals.
6. Refresh the page to confirm the report and review state persist.
7. Open **Reports** and filter by priority.

## Limitations

- Without an OpenAI key, classification is keyword matching, not AI.
- **Voice Transcript** is pasted text only; the app does not record audio or perform speech-to-text.
- Data is local to one browser. There is no authentication, database, map view, or multi-tenant support.
- The six starter reports are synthetic and are not real community submissions.
- The prototype has no automated test suite.