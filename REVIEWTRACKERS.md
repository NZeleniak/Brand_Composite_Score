# ReviewTrackers Refresh Workflow

This project can refresh `Brand Composite Score.html` from ReviewTrackers review-level data without using Snowflake or another database.

The final report is a standalone HTML file. Credentials are used only by local Node scripts and are never embedded in the report.

## 1. Create a token

Create `.env` from `.env.example`, then run:

```powershell
node scripts\reviewtrackers-auth.mjs create-token
```

ReviewTrackers tokens expire after 7 days and are tied to the script User-Agent.

Required `.env` values:

```env
REVIEWTRACKERS_EMAIL=your.email@chartwell.com
REVIEWTRACKERS_PASSWORD=your_password
```

Optional:

```env
REVIEWTRACKERS_ACCOUNT_ID=your_account_id
REVIEWTRACKERS_TOKEN=existing_token
```

Do not commit `.env` or `reviewtrackers-token.json`.

## 2. Optional residence mapping

Create `data/residence-master.json` from `data/residence-master.example.json` if you want region and care type labels. Without this file, locations are still included but region/care type will show as `Unmapped`.

## 3. Refresh the HTML report

```powershell
node scripts\reviewtrackers-refresh-report.mjs --published-after 2024-05-21 --published-before 2026-05-21
```

The script:

- pulls `/v2/reviews` with cursor pagination
- pulls `/locations` for official location names and active/inactive state
- pulls `/groups` and `/items` for group-to-location mapping when available
- pulls `/location_score/{account_id}/locations` as an optional comparison field
- finds the newest `Property_Data_Sheet_YYYY.csv` in the project folder, `data/`, or Downloads
- aggregates by location and source
- excludes non-residence employer sources such as Glassdoor and Indeed from residence scoring
- derives one operating region per residence from ReviewTrackers groups
- joins property sheet fields by normalized residence name
- calculates average rating, review count, and last review date per source
- writes `data/reviewtrackers-report-data.json`
- injects the same data into `Brand Composite Score.html`

## Property Data Sheet

The property sheet is manually replaced each year. Use this naming pattern:

```text
Property_Data_Sheet_2026.csv
Property_Data_Sheet_2027.csv
```

The script automatically uses the newest matching year. To force a specific file:

```powershell
node scripts\reviewtrackers-refresh-report.mjs --property-data-sheet "C:\path\to\Property_Data_Sheet_2026.csv" --published-after 2024-05-21 --published-before 2026-05-21
```

The scripts only read ReviewTrackers data, except `POST /auth`, which creates a temporary authentication token. They do not update reviews, responses, locations, groups, or statuses.

## 4. Files

- `Brand Composite Score.html`: final standalone report.
- `Documentation.html`: standalone documentation and operating runbook.
- `Property_Data_Sheet_YYYY.csv`: manually replaced annual property sheet.
- `scripts/reviewtrackers-auth.mjs`: creates and validates the ReviewTrackers token.
- `scripts/reviewtrackers-refresh-report.mjs`: fetches ReviewTrackers data and regenerates the report.
- `data/reviewtrackers-report-data.json`: normalized generated report data.
- `data/residence-master.json`: optional manual override for residence metadata.

## Notes

- Competitor endpoints are optional and only available on enterprise tiers.
- ReviewTrackers groups are used as the default region labels unless `data/residence-master.json` overrides them.
- Employer brand and BBB/trust data are still placeholders until separate data sources are provided.
- Do not paste credentials or tokens into the HTML report.
