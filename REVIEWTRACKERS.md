# ReviewTrackers Refresh Workflow

This project can refresh `Brand Composite Score.html` from ReviewTrackers review-level data without using Snowflake or another database.

## 1. Create a token

Create `.env` from `.env.example`, then run:

```powershell
node scripts\reviewtrackers-auth.mjs create-token
```

ReviewTrackers tokens expire after 7 days and are tied to the script User-Agent.

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
- aggregates by location and source
- calculates average rating, review count, and last review date per source
- writes `data/reviewtrackers-report-data.json`
- injects the same data into `Brand Composite Score.html`

## Notes

- Competitor endpoints are optional and only available on enterprise tiers.
- ReviewTrackers groups are used as the default region labels unless `data/residence-master.json` overrides them.
- Employer brand and BBB/trust data are still placeholders until separate data sources are provided.
- Do not paste credentials or tokens into the HTML report.
