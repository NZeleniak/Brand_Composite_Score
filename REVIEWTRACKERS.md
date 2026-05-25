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

Create `data/residence-master.json` from `data/residence-master.example.json` only if you need manual overrides. Without this file, locations are still included and ReviewTrackers groups are preserved; residences that are not in the operating-region group list are reported as `Outside operating-region groups`.

## 3. Refresh the HTML report

```powershell
node scripts\reviewtrackers-refresh-report.mjs --published-after 2024-05-21 --published-before 2026-05-21
```

The script:

- pulls `/v2/reviews` with cursor pagination
- pulls `/locations` for official location names and active/inactive state
- pulls `/groups` and `/items` for group-to-location mapping when available
- pulls `/location_score/{account_id}/locations` for the native ReviewTrackers Performance Score
- pulls `/metrics/overview/breakdown` for native dashboard KPIs: average rating, total reviews, response rate, and response time
- finds the newest `Property_Data_Sheet_YYYY.csv` in the project folder, `data/`, or Downloads
- aggregates by location and source for filtered/detail views
- excludes non-residence employer sources such as Glassdoor and Indeed from residence scoring
- derives one operating region per residence from ReviewTrackers groups
- joins property sheet fields by normalized residence name
- embeds resident NPS, employee NPS, occupancy, and property-sheet match diagnostics
- calculates average rating, review count, and last review date per source
- writes `data/reviewtrackers-report-data.json`
- injects the same data into `Brand Composite Score.html`

The default `All groups / All locations / All sources` dashboard uses ReviewTrackers-native aggregate endpoints first so the headline cards stay as close as possible to ReviewTrackers. Filtered views fall back to the generated residence/source data where the native endpoint does not provide the exact same precomputed slice.

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

## Data Modes

The report opens in `ReviewTrackers` mode. The filter bar has three data-mode buttons:

- `ReviewTrackers`: ReviewTrackers metrics and performance score only.
- `Spreadsheet`: spreadsheet-only mode using resident NPS, employee NPS, and occupancy.
- `Combined score`: the prior `Add residence data` behavior. Total Score is calculated as the average of:
  - ReviewTrackers Performance Score
  - resident NPS normalized with `(resident_nps + 100) / 2`
  - employee NPS normalized with `(employee_nps + 100) / 2`

Internal Score is calculated as the average of resident NPS score and employee NPS score after both are normalized to 0-100. The leaderboard uses the active mode score, and internal/combined modes show mapping diagnostics plus occupancy correlation.

Property sheet rows are matched by normalized residence name only. If a residence cannot be matched, the report lists it under unmatched residences when Spreadsheet or Combined score mode is enabled.

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
- `Outside operating-region groups` in refresh output means those residences have ReviewTrackers groups, but not one of the operating-region groups used for validation.
- Employer brand and BBB/trust data are not used in the current ReviewTrackers-style dashboard.
- Do not paste credentials or tokens into the HTML report.
