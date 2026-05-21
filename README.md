# Chartwell Brand Composite Score

Next.js + shadcn V1 report for Vercel. The app renders the Brand Composite Score dashboard from generated JSON and keeps ReviewTrackers credentials out of the browser and Vercel runtime.

## Local Setup

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Refresh Data

Create `.env` or `.env.local` with:

```env
REVIEWTRACKERS_EMAIL=your.email@chartwell.com
REVIEWTRACKERS_PASSWORD=your_password
```

Then run:

```powershell
npm run auth:reviewtrackers
npm run validate:reviewtrackers
npm run refresh:data
```

The refresh writes `data/reviewtrackers-report-data.json`, which is the V1 app data source.

## Property Sheet

Replace the yearly CSV manually using this pattern:

```text
Property_Data_Sheet_2026.csv
Property_Data_Sheet_2027.csv
```

The refresh script looks in the project folder, `data/`, and Downloads, then joins the newest matching file into the generated JSON.

## Vercel

For V1, deploy the generated JSON with the app. Do not add ReviewTrackers credentials to Vercel unless a future live refresh endpoint is implemented. Protect the deployment with Vercel deployment protection or team access.

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
```
