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
- pulls `/intel/locations` for residence competitor comparisons when competitor intel access is available
- finds the newest `Property_Data_Sheet_YYYY.csv` in the project folder, `data/`, or Downloads
- aggregates by location and source for filtered/detail views
- captures Glassdoor and Indeed as employer review snapshots, while excluding them from residence scoring
- derives one operating region per residence from ReviewTrackers groups
- joins property sheet fields by normalized residence name
- embeds resident NPS, employee NPS, occupancy, and property-sheet match diagnostics
- calculates average rating, review count, and last review date per source
- writes `data/reviewtrackers-report-data.json`
- injects the same data into `Brand Composite Score.html`

The default `All platforms / All locations / All sources` dashboard uses ReviewTrackers-native aggregate endpoints first so the headline cards stay as close as possible to ReviewTrackers. Filtered views fall back to the generated residence/source data where the native endpoint does not provide the exact same precomputed slice.

In the report UI, the underlying ReviewTrackers group filter is labeled as `Platforms`. The `Region` filter is currently a non-functional placeholder.

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

The report opens in `Reviews` mode. The filter bar currently shows three data-mode buttons:

- `Reviews`: ReviewTrackers metrics and performance score only.
  - When competitor intel exists, a `Compare` button opens a residence-vs-competitors table.
- `Survey`: survey-only mode using resident NPS, employee NPS, and occupancy.
- `Reputation score`: provisional Word-document logic with a formula selector:
  - Full score: Resident Experience 60%, Resident NPS 30%, Employer Brand 10%
  - Resident only: Resident Experience 60%, Resident NPS 40%
  - Occupancy is displayed in the table for context only and is not part of the score.
  - Table rows can be sorted with dropdowns by Resident Experience, Employer Brand when included, Resident NPS, Occupancy, Reviews, Confidence, or Reputation Score, then ordered High to low or Low to high.

`Combined score` remains in the code but is hidden from the dashboard for now. Total Score is calculated as the average of:
  - ReviewTrackers Performance Score
  - resident NPS normalized with `(resident_nps + 100) / 2`
  - employee NPS normalized with `(employee_nps + 100) / 2`

Survey Score is calculated as the average of resident NPS score and employee NPS score after both are normalized to 0-100. The leaderboard uses the active mode score, and survey-based modes show mapping diagnostics plus occupancy correlation.

Reputation score uses true NPS scale (`-100..100`). Employee NPS is combined with the Glassdoor/Indeed employer review signal inside Employer Brand. Resident NPS is the NPS component:

```text
employee_nps_score = (employee_nps + 100) / 2
employer_review_score = Glassdoor + Indeed weighted score
employer_brand = average(employee_nps_score, employer_review_score)
nps_component = (resident_nps + 100) / 2
```

It then calculates one of two selected formulas:

```text
full_reputation_score =
  resident_experience * 0.60
+ nps_component * 0.30
+ employer_brand * 0.10

resident_only_reputation_score =
  resident_experience * 0.60
+ nps_component * 0.40
```

Resident Experience follows the Word document formula:

```text
rating_100 = (rating_raw / rating_scale) * 100
volume_weight = ln(1 + review_count)
resident_experience =
  sum(rating_100 * volume_weight * recency_weight * source_weight)
  / sum(volume_weight * recency_weight * source_weight)
```

Employer Brand combines two signals: employee NPS from the matched property sheet and Glassdoor/Indeed ratings normalized to 0-100 and weighted by `ln(1 + review_count)`.

Property sheet rows are matched by normalized residence name only. If a residence cannot be matched, the report lists it under unmatched residences when Survey or Reputation score mode is enabled.

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

- Competitor endpoints are optional and only available on enterprise tiers. The report uses `GET /intel/locations` and shows competitor comparisons only in `Reviews` mode.
- ReviewTrackers groups are used as the default region labels unless `data/residence-master.json` overrides them.
- `Outside operating-region groups` in refresh output means those residences have ReviewTrackers groups, but not one of the operating-region groups used for validation.
- Employer Brand is used only in Reputation score and combines Employee NPS with Glassdoor/Indeed snapshots when available.
- BBB/trust/friction remains out of scope until a real source is added.
- Do not paste credentials or tokens into the HTML report.
