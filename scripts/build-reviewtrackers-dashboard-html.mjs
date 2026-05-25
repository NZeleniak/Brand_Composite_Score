import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("data/reviewtrackers-report-data.json", "utf8"));
const serializedData = JSON.stringify(data, null, 2);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ReviewTrackers Dashboard</title>
  <style>
    :root {
      --bg: #f6f8fb;
      --panel: #ffffff;
      --ink: #13213a;
      --muted: #5f6b7a;
      --line: #d9e0ea;
      --blue: #0073e6;
      --blue-dark: #0057ad;
      --chartwell: #9d0f63;
      --chartwell-dark: #7f0c50;
      --yellow: #ffc72c;
      --green: #69b43f;
      --orange: #f5a313;
      --red: #f15b49;
      --shadow: 0 12px 28px rgba(19, 33, 58, 0.08);
      --radius: 6px;
      --max: 1420px;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        linear-gradient(180deg, rgba(157, 15, 99, 0.08), rgba(0, 115, 230, 0.035) 320px, rgba(0, 115, 230, 0) 560px),
        var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.35;
    }
    button, select { font: inherit; }
    .page { max-width: var(--max); margin: 0 auto; padding: 28px 30px 48px; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand-lockup { display: flex; align-items: center; gap: 14px; }
    .mark {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: #fff;
      background: var(--chartwell);
      box-shadow: 0 8px 20px rgba(157, 15, 99, 0.22);
      flex: 0 0 auto;
    }
    h1 { margin: 0; font-size: 42px; line-height: 1; font-weight: 800; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .page-switch {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.82);
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(53, 35, 49, 0.08);
    }
    .page-switch a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
    }
    .page-switch a.active { color: #fff; background: var(--chartwell); }
    .outline-btn {
      min-height: 58px;
      padding: 0 26px;
      border: 1px solid var(--blue);
      border-radius: var(--radius);
      color: var(--chartwell);
      background: #fff;
      cursor: pointer;
      font-size: 22px;
      font-weight: 700;
    }
    .outline-btn:hover { background: #fbf1f7; }
    .filters {
      margin-top: 58px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 10px 24px rgba(19, 33, 58, 0.06);
    }
    .filters-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 21px;
      font-weight: 800;
      letter-spacing: 0.01em;
    }
    .filters-head a { color: var(--blue); font-weight: 500; text-decoration: none; }
    .filters-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
    }
    .select-box {
      width: 246px;
      min-width: 246px;
      height: 57px;
      padding: 0 22px;
      border: 1px solid #93a4bb;
      border-radius: var(--radius);
      color: var(--ink);
      background: #fff;
      font-size: 22px;
      appearance: auto;
    }
    .custom-select { position: relative; width: 246px; }
    .custom-trigger {
      width: 100%;
      height: 57px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 22px;
      border: 1px solid #93a4bb;
      border-radius: var(--radius);
      color: var(--ink);
      background: #fff;
      cursor: pointer;
      font-size: 22px;
      text-align: left;
    }
    .custom-trigger span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .custom-trigger .chevron { flex: 0 0 auto; font-size: 24px; line-height: 1; }
    .dropdown {
      position: absolute;
      z-index: 20;
      top: calc(100% + 6px);
      left: 0;
      width: 480px;
      max-width: min(480px, calc(100vw - 32px));
      max-height: 638px;
      padding: 12px 14px 0;
      border: 1px solid #b8aabc;
      border-radius: var(--radius);
      background: #fff;
      box-shadow: 0 14px 36px rgba(19, 33, 58, 0.16);
    }
    .dropdown[hidden] { display: none; }
    .dropdown-search {
      width: 100%;
      height: 45px;
      padding: 0 46px 0 12px;
      border: 1px solid #8fa0b8;
      border-radius: var(--radius);
      color: var(--ink);
      font-size: 22px;
      outline: none;
    }
    .dropdown-search-wrap { position: relative; }
    .dropdown-search-wrap::after {
      content: "⌕";
      position: absolute;
      right: 14px;
      top: 2px;
      color: #000;
      font-size: 36px;
      line-height: 1;
      transform: rotate(-20deg);
    }
    .dropdown-list {
      max-height: 552px;
      margin-top: 8px;
      overflow-y: auto;
      padding: 0 0 12px;
      scrollbar-color: #8d8d8d #fff;
      scrollbar-width: auto;
    }
    .dropdown-option {
      width: 100%;
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 10px;
      padding: 11px 4px;
      border: 0;
      background: transparent;
      color: var(--ink);
      cursor: pointer;
      text-align: left;
    }
    .dropdown-option:hover { background: #fbf1f7; }
    .checkmark { color: var(--chartwell); font-size: 22px; line-height: 1.1; }
    .option-label { font-size: 22px; line-height: 1.2; }
    .option-subtitle { margin-top: 4px; color: #8b96a6; font-size: 21px; line-height: 1.2; }
    .date-box { min-width: 360px; }
    .date-pill {
      min-height: 57px;
      display: inline-flex;
      align-items: center;
      padding: 0 22px;
      border: 1px solid #93a4bb;
      border-radius: var(--radius);
      color: var(--ink);
      background: #fff;
      font-size: 22px;
    }
    .data-mode-control {
      grid-column: 1 / -1;
      display: inline-flex;
      width: fit-content;
      padding: 5px;
      border: 1px solid #93a4bb;
      border-radius: 999px;
      background: #fff;
    }
    .data-mode-btn {
      min-height: 57px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px;
      border: 0;
      border-radius: 999px;
      color: var(--ink);
      background: transparent;
      cursor: pointer;
      font-size: 20px;
      font-weight: 800;
    }
    .data-mode-btn.active {
      color: #fff;
      background: var(--chartwell);
      box-shadow: 0 10px 22px rgba(157, 15, 99, 0.24);
    }
    .data-mode-btn:hover { background: #fbf1f7; }
    .data-mode-btn.active:hover { background: var(--chartwell); }
    .data-mode-btn::before {
      content: "";
      width: 22px;
      height: 22px;
      display: inline-grid;
      place-items: center;
      border: 2px solid currentColor;
      border-radius: 50%;
      font-size: 17px;
      line-height: 1;
    }
    .data-mode-btn.active::before { content: "✓"; }
    .data-mode-note {
      width: 100%;
      display: none;
      padding: 12px 16px;
      border-left: 4px solid var(--chartwell);
      border-radius: var(--radius);
      background: #fff7fb;
      color: var(--muted);
      font-size: 15px;
    }
    .data-mode-note.active { display: block; }
    .data-mode-note strong { color: var(--ink); }
    .dashboard-spacer { height: 56px; }
    .dashboard-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .summary-main {
      min-height: 214px;
      display: grid;
      place-items: center;
      position: relative;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(90deg, rgba(157, 15, 99, 0.06), rgba(255, 255, 255, 0));
    }
    .collapse { position: absolute; top: 0; right: 12px; color: #8d98a6; font-size: 34px; }
    .performance { display: grid; grid-template-columns: 64px auto; gap: 18px; align-items: center; }
    .status-icon {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 40px;
      font-weight: 900;
      box-shadow: 0 0 0 4px #fff;
    }
    .status-icon.neutral { background: var(--orange); }
    .status-icon.good { background: var(--green); }
    .status-icon.bad { background: var(--red); }
    .metric-name { font-size: 22px; font-weight: 500; }
    .info-dot {
      display: inline-grid;
      place-items: center;
      width: 20px;
      height: 20px;
      margin-left: 4px;
      border-radius: 50%;
      background: var(--muted);
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      vertical-align: middle;
    }
    .performance-value { margin-top: 4px; font-size: 42px; line-height: 1; font-weight: 800; }
    .variance { margin-top: 22px; color: var(--muted); font-size: 18px; }
    .variance .positive { color: #4d7f00; font-weight: 800; }
    .variance .neutral { color: #ff9900; font-weight: 800; }
    .variance .negative { color: #f00000; font-weight: 800; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .metric-tile {
      min-height: 190px;
      display: grid;
      grid-template-columns: 64px auto;
      gap: 20px;
      align-items: start;
      padding: 28px 38px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    .metric-tile:first-child { border-top: 4px solid var(--chartwell); }
    .metric-tile[data-enhanced] { background: linear-gradient(180deg, #fff, #fff8fc); }
    .metric-tile:nth-child(4n) { border-right: 0; }
    .metric-tile[hidden] { display: none; }
    .metric-value { margin-top: 8px; font-size: 42px; line-height: 1; font-weight: 800; }
    h2 { margin: 0; font-size: 25px; line-height: 1.1; }
    .leaderboard-layout { margin-top: 34px; }
    .tabs { display: inline-flex; gap: 0; padding: 6px; border-radius: 8px; background: #dfe4ec; }
    .tab {
      min-width: 164px;
      height: 58px;
      border: 0;
      border-radius: 8px;
      color: var(--muted);
      background: transparent;
      cursor: pointer;
      font-size: 21px;
      font-weight: 800;
    }
    .tab.active { color: var(--blue); background: #fff; }
    .leader-table {
      margin-top: 24px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      box-shadow: var(--shadow);
    }
    .leader-table table { min-width: 920px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 19px 18px; text-align: left; vertical-align: middle; font-size: 18px; }
    th { color: var(--muted); background: #f3f6fa; border-bottom: 3px solid #d6d6d6; font-weight: 800; }
    tr:nth-child(even) td { background: #fbfbfc; }
    .leader-table tbody tr:hover td { background: #fff7fb; }
    .rank-cell { width: 110px; font-weight: 800; }
    .medal { margin-right: 12px; font-size: 24px; vertical-align: middle; }
    .location-name { font-weight: 800; line-height: 1.15; }
    .location-meta { margin-top: 4px; color: var(--muted); font-size: 14px; }
    .score-cell { white-space: nowrap; font-weight: 800; }
    .table-number { white-space: nowrap; font-weight: 800; }
    .empty { color: var(--muted); font-size: 18px; }
    .note { margin-top: 18px; color: var(--muted); font-size: 14px; }
    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 7px 10px;
      border-radius: 999px;
      background: #eef5ff;
      color: var(--blue-dark);
      font-size: 13px;
      font-weight: 800;
    }
    .mode-badge.enhanced { background: #fbf1f7; color: var(--chartwell-dark); }
    .enhanced-panel {
      margin-top: 34px;
      padding: 28px;
      overflow: hidden;
    }
    .enhanced-panel[hidden] { display: none; }
    .enhanced-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }
    .enhanced-head p { margin: 8px 0 0; color: var(--muted); font-size: 16px; }
    .correlation-kpi {
      min-width: 220px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      text-align: right;
    }
    .correlation-kpi strong { display: block; font-size: 34px; line-height: 1; }
    .correlation-kpi span { display: block; margin-top: 6px; color: var(--muted); font-size: 14px; }
    .formula-strip {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
      gap: 14px;
      margin-bottom: 22px;
    }
    .formula-card {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #f8fbff;
    }
    .formula-card strong { display: block; margin-bottom: 6px; font-size: 15px; }
    .formula-card span { color: var(--muted); font-size: 14px; }
    .diagnostics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }
    .diagnostic {
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
    }
    .diagnostic strong { display: block; font-size: 26px; }
    .diagnostic span { color: var(--muted); font-size: 14px; }
    .unmatched-list {
      margin: 0 0 22px;
      padding: 16px;
      border: 1px solid #f0c8dd;
      border-radius: var(--radius);
      background: #fff7fb;
      color: var(--ink);
    }
    .unmatched-list h3 { margin: 0 0 10px; font-size: 18px; }
    .unmatched-list p { margin: 0; color: var(--muted); }
    .unmatched-list ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 18px;
      margin: 0;
      padding-left: 20px;
      color: var(--muted);
    }

    @media (max-width: 980px) {
      .page { padding: 22px 16px 40px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .filters { margin-top: 42px; }
      .targets-row { margin-top: 48px; }
      .metric-grid, .metric-grid.enhanced, .leaderboard-layout, .diagnostics, .formula-strip { grid-template-columns: 1fr; }
      .metric-tile { border-right: 0; border-bottom: 1px solid var(--line); }
      .filters-grid { gap: 12px; }
      .select-box, .custom-select, .date-box { width: 100%; min-width: 0; }
      .dropdown { width: 100%; }
      .data-mode-control { width: 100%; flex-direction: column; border-radius: var(--radius); }
      .data-mode-btn { width: 100%; justify-content: center; }
      .enhanced-head { flex-direction: column; }
      .correlation-kpi { width: 100%; text-align: left; }
      .unmatched-list ul { grid-template-columns: 1fr; }
    }

    @media print {
      body { background: #fff; }
      .actions, .filters { display: none; }
      .page { max-width: none; padding: 0; }
      .dashboard-card, .leader-table { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="mark" aria-hidden="true">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
            <path d="M5 18.5V9.25L12 4l7 5.25v9.25h-5.1v-5.8h-3.8v5.8H5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Dashboard</h1>
      </div>
      <div class="actions">
        <nav class="page-switch" aria-label="Report pages">
          <a class="active" href="Brand Composite Score.html">Report</a>
          <a href="Documentation.html">Documentation</a>
        </nav>
        <button class="outline-btn" type="button" onclick="window.print()">▣&nbsp; Print</button>
      </div>
    </header>

    <section class="filters" aria-label="Dashboard filters">
      <div class="filters-head">
        <div>FILTERS</div>
        <a href="#" id="clearAll">Clear All</a>
      </div>
      <div class="filters-grid">
        <div class="custom-select" id="groupSelect">
          <button class="custom-trigger" id="groupTrigger" type="button" aria-expanded="false"><span>All groups</span><span class="chevron">⌄</span></button>
          <div class="dropdown" id="groupDropdown" hidden>
            <div class="dropdown-search-wrap"><input class="dropdown-search" id="groupSearch" placeholder="Search groups..." /></div>
            <div class="dropdown-list" id="groupOptions"></div>
          </div>
        </div>
        <div class="custom-select" id="locationSelect">
          <button class="custom-trigger" id="locationTrigger" type="button" aria-expanded="false"><span>All locations</span><span class="chevron">⌄</span></button>
          <div class="dropdown" id="locationDropdown" hidden>
            <div class="dropdown-search-wrap"><input class="dropdown-search" id="locationSearch" placeholder="Search locations..." /></div>
            <div class="dropdown-list" id="locationOptions"></div>
          </div>
        </div>
        <div class="custom-select" id="sourceSelect">
          <button class="custom-trigger" id="sourceTrigger" type="button" aria-expanded="false"><span>All sources</span><span class="chevron">⌄</span></button>
          <div class="dropdown" id="sourceDropdown" hidden>
            <div class="dropdown-list" id="sourceOptions"></div>
          </div>
        </div>
        <div class="date-pill" id="dateRangeLabel" aria-label="Report date range"></div>
        <div class="data-mode-control" role="group" aria-label="Data source mode">
          <button class="data-mode-btn active" data-mode-button="external" type="button" aria-pressed="true">ReviewTrackers</button>
          <button class="data-mode-btn" data-mode-button="internal" type="button" aria-pressed="false">Spreadsheet</button>
          <button class="data-mode-btn" data-mode-button="combined" type="button" aria-pressed="false">Combined score</button>
          <button class="data-mode-btn" data-mode-button="document" type="button" aria-pressed="false">Document Logic</button>
        </div>
        <div class="data-mode-note" id="dataModeNote">
          <strong id="dataModeNoteTitle">External data:</strong> <span id="dataModeNoteBody">ReviewTrackers metrics and performance score only.</span>
        </div>
      </div>
    </section>

    <div class="dashboard-spacer"></div>

    <main class="dashboard-card">
      <section class="summary-main" aria-label="Performance score">
        <div class="collapse">⌃</div>
        <div class="performance">
          <div class="status-icon neutral" id="performanceIcon">−</div>
          <div>
            <div class="metric-name"><span id="performanceTitle">Performance Score</span> <span class="info-dot">i</span></div>
            <div class="performance-value"><span id="performanceScore">--</span>/100</div>
            <div class="variance" id="performanceDescription">ReviewTrackers location performance score</div>
          </div>
        </div>
      </section>

      <section class="metric-grid" id="metricGrid" aria-label="Summary metrics">
        <article class="metric-tile" data-external>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name">Average Rating</div>
            <div class="metric-value" id="averageRating">--</div>
            <div class="variance">Weighted by review volume</div>
          </div>
        </article>
        <article class="metric-tile" data-external>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name">Total Reviews</div>
            <div class="metric-value" id="totalReviews">--</div>
            <div class="variance">Included residence sources</div>
          </div>
        </article>
        <article class="metric-tile" data-external>
          <div class="status-icon neutral">−</div>
          <div>
            <div class="metric-name">Response Rate</div>
            <div class="metric-value" id="responseRate">--</div>
            <div class="variance">From ReviewTrackers performance score data</div>
          </div>
        </article>
        <article class="metric-tile" data-external>
          <div class="status-icon good" id="responseTimeIcon">↓</div>
          <div>
            <div class="metric-name">Response Time</div>
            <div class="metric-value"><span id="responseTime">--</span> days</div>
            <div class="variance">From ReviewTrackers metrics data</div>
          </div>
        </article>
        <article class="metric-tile" data-enhanced hidden>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name" id="totalScoreLabel">Total Score</div>
            <div class="metric-value"><span id="totalScore">--</span>/100</div>
            <div class="variance" id="totalScoreDescription">ReviewTrackers + resident NPS + employee NPS</div>
          </div>
        </article>
        <article class="metric-tile" data-enhanced hidden>
          <div class="status-icon neutral">−</div>
          <div>
            <div class="metric-name">Resident NPS</div>
            <div class="metric-value" id="residentNps">--</div>
            <div class="variance">Matched spreadsheet residences</div>
          </div>
        </article>
        <article class="metric-tile" data-enhanced hidden>
          <div class="status-icon neutral">−</div>
          <div>
            <div class="metric-name">Employee NPS</div>
            <div class="metric-value" id="employeeNps">--</div>
            <div class="variance">Matched spreadsheet residences</div>
          </div>
        </article>
        <article class="metric-tile" data-enhanced hidden>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name">Occupancy</div>
            <div class="metric-value"><span id="occupancyAverage">--</span>%</div>
            <div class="variance">Average from property data sheet</div>
          </div>
        </article>
        <article class="metric-tile" data-document hidden>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name">Resident Experience</div>
            <div class="metric-value"><span id="documentResidentExperience">--</span>/100</div>
            <div class="variance">Weighted review model</div>
          </div>
        </article>
        <article class="metric-tile" data-document hidden>
          <div class="status-icon neutral">−</div>
          <div>
            <div class="metric-name">Employer Brand</div>
            <div class="metric-value"><span id="documentEmployerBrand">--</span>/100</div>
            <div class="variance">Glassdoor + Indeed</div>
          </div>
        </article>
        <article class="metric-tile" data-document hidden>
          <div class="status-icon neutral">−</div>
          <div>
            <div class="metric-name">NPS Component</div>
            <div class="metric-value"><span id="documentNpsComponent">--</span>/100</div>
            <div class="variance">Resident + employee NPS</div>
          </div>
        </article>
        <article class="metric-tile" data-document hidden>
          <div class="status-icon good">↑</div>
          <div>
            <div class="metric-name">Confidence</div>
            <div class="metric-value" id="documentConfidence">--</div>
            <div class="variance">Review volume + sources</div>
          </div>
        </article>
      </section>
    </main>

    <section class="leaderboard-layout" aria-label="Leaderboard">
      <div class="tabs" role="tablist" aria-label="Leaderboard view">
        <button class="tab active" id="locationsTab" type="button">Locations</button>
        <button class="tab" id="groupsTab" type="button">Groups</button>
      </div>
      <div class="leader-table">
        <table>
          <thead>
            <tr id="leaderHeaderRow"></tr>
          </thead>
          <tbody id="leaderRows"></tbody>
        </table>
      </div>
    </section>

    <section class="dashboard-card enhanced-panel" id="enhancedPanel" aria-label="Residence data analysis" hidden>
      <div class="enhanced-head">
        <div>
          <h2 id="enhancedPanelTitle">Residence Data Analysis</h2>
          <p id="enhancedPanelCopy">Uses matched property sheet rows for resident NPS, employee NPS, occupancy, and the optional Total Score.</p>
        </div>
        <div class="correlation-kpi">
          <strong id="correlationValue">--</strong>
          <span id="correlationLabel">Occupancy vs. Total Score</span>
        </div>
      </div>
      <div class="diagnostics" aria-label="Mapping diagnostics">
        <div class="diagnostic"><strong id="diagnosticActive">--</strong><span>Active residences in view</span></div>
        <div class="diagnostic"><strong id="diagnosticMatched">--</strong><span>Matched to property sheet</span></div>
        <div class="diagnostic"><strong id="diagnosticUnmatched">--</strong><span>Unmatched residences</span></div>
      </div>
      <div class="formula-strip">
        <div class="formula-card">
          <strong id="formulaTitle">Total Score formula</strong>
          <span id="formulaCopy">Average of ReviewTrackers Performance Score, resident NPS normalized to 0-100, and employee NPS normalized to 0-100.</span>
        </div>
        <div class="formula-card">
          <strong>Spreadsheet source</strong>
          <span id="propertySourceLabel">Property data sheet</span>
        </div>
      </div>
      <div class="unmatched-list" id="unmatchedList" hidden></div>
    </section>
  </div>

  <script>
    const sampleData = ${serializedData};

    const sourceWeights = sampleData.documentLogicConfig?.residenceSourceWeights || {
      Google: 1.0,
      Yelp: 0.8,
      Facebook: 0.7,
      SeniorAdvisor: 0.6,
      APlaceForMom: 0.6,
      Caring: 0.6
    };
    const sourceAliases = {
      google: "Google",
      yelp: "Yelp",
      facebook: "Facebook",
      senioradvisor: "SeniorAdvisor",
      senioradvisorcom: "SeniorAdvisor",
      aplaceformom: "APlaceForMom",
      aplaceformomcom: "APlaceForMom",
      caring: "Caring",
      caringcom: "Caring"
    };
    const documentLogicWeights = Object.assign({
      residentExperience: 0.7,
      employerBrand: 0.2,
      npsComponent: 0.1
    }, sampleData.documentLogicConfig?.weights || {});

    const state = { group: "All groups", location: "All locations", source: "All sources", view: "locations", dataMode: "external" };

    function normalizeSourceKey(source) {
      return String(source || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function sourceWeightFor(source) {
      const canonical = sourceAliases[normalizeSourceKey(source)] || source;
      return Number(sourceWeights[canonical] || 0);
    }

    function groupsForResidence(residence) {
      return Array.isArray(residence.groups) ? residence.groups.filter(Boolean) : [];
    }

    function primaryGroupForResidence(residence) {
      return groupsForResidence(residence)[0] || "No ReviewTrackers group";
    }

    function activeResidences() {
      return sampleData.residences.filter(function (residence) { return residence.active; });
    }

    function reviewInScope(review) {
      if (sourceWeightFor(review.source) <= 0) return false;
      if (state.source !== "All sources" && review.source !== state.source) return false;
      return scopedResidences().some(function (residence) { return residence.id === review.residenceId; });
    }

    function scopedResidences() {
      return activeResidences().filter(function (residence) {
        if (state.group !== "All groups" && !groupsForResidence(residence).includes(state.group)) return false;
        if (state.location !== "All locations" && residence.id !== state.location) return false;
        return true;
      });
    }

    function scopedReviews() {
      return sampleData.reviewSnapshots.filter(reviewInScope);
    }

    function weightedRating5(reviews) {
      const totals = reviews.reduce(function (acc, review) {
        acc.weighted += Number(review.ratingRaw || 0) * Number(review.reviewCount || 0);
        acc.count += Number(review.reviewCount || 0);
        return acc;
      }, { weighted: 0, count: 0 });
      return totals.count ? totals.weighted / totals.count : null;
    }

    function weightedAverage(values) {
      const usable = values.filter(function (item) { return item.value !== null && item.value !== undefined && !Number.isNaN(Number(item.value)) && item.weight > 0; });
      const totals = usable.reduce(function (acc, item) {
        acc.weighted += Number(item.value) * Number(item.weight);
        acc.weight += Number(item.weight);
        return acc;
      }, { weighted: 0, weight: 0 });
      return totals.weight ? totals.weighted / totals.weight : null;
    }

    function reviewCountFor(reviews) {
      return reviews.reduce(function (sum, review) { return sum + Number(review.reviewCount || 0); }, 0);
    }

    function sourceCountFor(reviews) {
      return new Set(reviews.map(function (review) {
        return sourceWeightFor(review.source) > 0 ? sourceAliases[normalizeSourceKey(review.source)] || review.source : "";
      }).filter(Boolean)).size;
    }

    function hasNumber(value) {
      return value !== null && value !== undefined && !Number.isNaN(Number(value));
    }

    function averageNumbers(values) {
      const usable = values.filter(hasNumber).map(Number);
      if (!usable.length) return null;
      return usable.reduce(function (sum, value) { return sum + value; }, 0) / usable.length;
    }

    function reviewTrackersScoreFor(residence, reviews) {
      if (hasNumber(residence.reviewTrackersPerformanceScore)) return Number(residence.reviewTrackersPerformanceScore);
      const reviewSummary = reviewsForResidence(residence.id, reviews);
      return reviewSummary.averageRating ? reviewSummary.averageRating * 20 : null;
    }

    function npsToScore(value) {
      if (!hasNumber(value)) return null;
      return Math.max(0, Math.min(100, (Number(value) + 100) / 2));
    }

    function rating100(review) {
      const rating = Number(review.ratingRaw);
      const scale = Number(review.ratingScale || 5);
      if (!Number.isFinite(rating) || !Number.isFinite(scale) || scale <= 0) return null;
      return (rating / scale) * 100;
    }

    function recencyWeightFor(dateValue) {
      if (!dateValue) return 0.5;
      const endDate = new Date((sampleData.publishedBefore || sampleData.asOfDate) + "T00:00:00");
      const reviewDateValue = new Date(String(dateValue).slice(0, 10) + "T00:00:00");
      if (Number.isNaN(reviewDateValue.getTime()) || Number.isNaN(endDate.getTime())) return 0.5;
      const ageMonths = Math.max(0, (endDate - reviewDateValue) / 86400000 / 30.4375);
      if (ageMonths <= 12) return 1;
      if (ageMonths <= 24) return 0.7;
      return 0.5;
    }

    function confidenceGrade(reviewCount, sourceCount) {
      if (reviewCount >= 120 && sourceCount >= 2) return "A";
      if (reviewCount >= 60 && reviewCount <= 119 && sourceCount >= 2) return "B";
      if ((reviewCount >= 20 && reviewCount <= 59) || sourceCount === 1) return "C";
      return "D";
    }

    function residentExperienceForReviews(reviews) {
      const totals = reviews.reduce(function (acc, review) {
        const normalizedRating = rating100(review);
        const volumeWeight = Math.log1p(Number(review.reviewCount || 0));
        const recencyWeight = recencyWeightFor(review.lastReviewDate || review.snapshotDate);
        const sourceWeight = sourceWeightFor(review.source);
        const weight = volumeWeight * recencyWeight * sourceWeight;
        if (!hasNumber(normalizedRating) || weight <= 0) return acc;
        acc.weighted += normalizedRating * weight;
        acc.weight += weight;
        return acc;
      }, { weighted: 0, weight: 0 });
      const reviewCount = reviewCountFor(reviews);
      const sourceCount = sourceCountFor(reviews);
      return {
        score: totals.weight ? totals.weighted / totals.weight : null,
        reviewCount: reviewCount,
        sourceCount: sourceCount,
        confidence: confidenceGrade(reviewCount, sourceCount)
      };
    }

    function employerBrandScore() {
      const snapshots = sampleData.employerSnapshots || sampleData.employerBrand || [];
      const totals = snapshots.reduce(function (acc, snapshot) {
        const normalizedRating = rating100(snapshot);
        const weight = Math.log1p(Number(snapshot.reviewCount || 0));
        if (!hasNumber(normalizedRating) || weight <= 0) return acc;
        acc.weighted += normalizedRating * weight;
        acc.weight += weight;
        return acc;
      }, { weighted: 0, weight: 0 });
      return totals.weight ? totals.weighted / totals.weight : null;
    }

    function documentLogicScore(residentExperience, employerBrand, npsComponent) {
      if (!hasNumber(residentExperience) || !hasNumber(employerBrand) || !hasNumber(npsComponent)) return null;
      return residentExperience * documentLogicWeights.residentExperience +
        employerBrand * documentLogicWeights.employerBrand +
        npsComponent * documentLogicWeights.npsComponent;
    }

    function reviewTrackersRegionForPropertyCode(code) {
      const normalized = String(code || "").trim().toUpperCase();
      if (!normalized) return "";
      if (normalized.startsWith("OW")) return "Ontario West - OW";
      if (normalized.startsWith("OE")) return "Ontario East - OE";
      if (normalized.startsWith("O")) return "Ontario - ON";
      if (normalized.startsWith("QC") || normalized.startsWith("Q")) return "Quebec - QC";
      if (normalized.startsWith("AB") || normalized.startsWith("A")) return "Alberta - AB";
      if (normalized.startsWith("BC") || normalized.startsWith("B")) return "British Columbia - BC";
      if (normalized.startsWith("W")) return "West";
      return normalized;
    }

    function enhancedForResidence(residence, reviews) {
      if (!residence.propertyData) return null;
      const reviewScore = reviewTrackersScoreFor(residence, reviews);
      const residenceReviews = reviewsForResidence(residence.id, reviews).items;
      const residentExperience = residentExperienceForReviews(residenceReviews);
      const employerBrand = employerBrandScore();
      const residentNpsScore = npsToScore(residence.propertyData.residentNps);
      const employeeNpsScore = npsToScore(residence.propertyData.employeeNps);
      if (!hasNumber(residentNpsScore) || !hasNumber(employeeNpsScore)) return null;
      const internalScore = averageNumbers([residentNpsScore, employeeNpsScore]);
      const totalScore = hasNumber(reviewScore) ? averageNumbers([reviewScore, residentNpsScore, employeeNpsScore]) : null;
      const documentScore = documentLogicScore(residentExperience.score, employerBrand, internalScore);
      return {
        residence: residence,
        propertyRegion: residence.propertyData.propertyRegion || "",
        mappedRegion: reviewTrackersRegionForPropertyCode(residence.propertyData.propertyRegion),
        occupancy: residence.propertyData.occupancyAverage,
        reviewScore: reviewScore,
        residentExperienceScore: residentExperience.score,
        employerBrandScore: employerBrand,
        residentNps: residence.propertyData.residentNps,
        employeeNps: residence.propertyData.employeeNps,
        residentNpsScore: residentNpsScore,
        employeeNpsScore: employeeNpsScore,
        npsComponent: internalScore,
        internalScore: internalScore,
        totalScore: totalScore,
        documentLogicScore: documentScore,
        reviewCount: residentExperience.reviewCount,
        sourceCount: residentExperience.sourceCount,
        confidence: residentExperience.confidence
      };
    }

    function enhancedRowsFor(residences, reviews) {
      return residences.map(function (residence) { return enhancedForResidence(residence, reviews); }).filter(Boolean);
    }

    function pearsonCorrelation(rows) {
      const usable = rows.filter(function (row) { return hasNumber(row.occupancy) && hasNumber(scoreForEnhancedRow(row)); });
      if (usable.length < 2) return null;
      const avgX = averageNumbers(usable.map(function (row) { return row.occupancy; }));
      const avgY = averageNumbers(usable.map(scoreForEnhancedRow));
      const parts = usable.reduce(function (acc, row) {
        const dx = Number(row.occupancy) - avgX;
        const dy = Number(scoreForEnhancedRow(row)) - avgY;
        acc.numerator += dx * dy;
        acc.x += dx * dx;
        acc.y += dy * dy;
        return acc;
      }, { numerator: 0, x: 0, y: 0 });
      const denominator = Math.sqrt(parts.x * parts.y);
      return denominator ? parts.numerator / denominator : null;
    }

    function metricsFor(residences, reviews) {
      const reviewCount = reviews.reduce(function (sum, review) { return sum + Number(review.reviewCount || 0); }, 0);
      const enhancedRows = enhancedRowsFor(residences, reviews);
      const score = weightedAverage(residences.map(function (residence) {
        return { value: residence.reviewTrackersPerformanceScore, weight: reviewsForResidence(residence.id, reviews).reviewCount || 1 };
      }));
      const responseRate = weightedAverage(residences.map(function (residence) {
        return { value: residence.reviewTrackersResponseRate, weight: reviewsForResidence(residence.id, reviews).reviewCount || 1 };
      }));
      const responseTimeMs = weightedAverage(residences.map(function (residence) {
        return { value: residence.reviewTrackersResponseTimeMs, weight: reviewsForResidence(residence.id, reviews).reviewCount || 1 };
      }));
      const nativeMetrics = state.dataMode === "external" && defaultReviewTrackersView() ? sampleData.reviewTrackersDashboardMetrics || {} : {};
      const internalScore = averageNumbers(enhancedRows.map(function (row) { return row.internalScore; }));
      const combinedScore = averageNumbers(enhancedRows.map(function (row) { return row.totalScore; }));
      const residentExperience = residentExperienceForReviews(reviews);
      const employerBrand = employerBrandScore();
      const npsComponent = averageNumbers(enhancedRows.map(function (row) { return row.npsComponent; }));
      const documentScore = documentLogicScore(residentExperience.score, employerBrand, npsComponent);
      return {
        performanceScore: state.dataMode === "internal"
          ? internalScore
          : state.dataMode === "document"
            ? documentScore
            : state.dataMode === "combined"
            ? combinedScore
            : hasNumber(nativeMetrics.performanceScore) ? nativeMetrics.performanceScore : score,
        averageRating: hasNumber(nativeMetrics.averageRating) ? nativeMetrics.averageRating : weightedRating5(reviews),
        totalReviews: hasNumber(nativeMetrics.totalReviews) ? nativeMetrics.totalReviews : reviewCount,
        responseRate: hasNumber(nativeMetrics.responseRate) ? nativeMetrics.responseRate : responseRate,
        responseTimeMs: hasNumber(nativeMetrics.avgResponseTimeMs) ? nativeMetrics.avgResponseTimeMs : responseTimeMs,
        nativeMetricsActive: Boolean(defaultReviewTrackersView() && Object.keys(nativeMetrics).length),
        internalScore: internalScore,
        totalScore: combinedScore,
        documentLogicScore: documentScore,
        residentExperience: residentExperience.score,
        employerBrand: employerBrand,
        npsComponent: npsComponent,
        confidence: residentExperience.confidence,
        residentNps: averageNumbers(enhancedRows.map(function (row) { return row.residentNps; })),
        employeeNps: averageNumbers(enhancedRows.map(function (row) { return row.employeeNps; })),
        occupancyAverage: averageNumbers(enhancedRows.map(function (row) { return row.occupancy; })),
        enhancedRows: enhancedRows
      };
    }

    function defaultReviewTrackersView() {
      return state.group === "All groups" && state.location === "All locations" && state.source === "All sources";
    }

    function usesInternalData() {
      return state.dataMode === "internal" || state.dataMode === "combined" || state.dataMode === "document";
    }

    function modeScoreLabel() {
      return state.dataMode === "internal" ? "Internal Score" : state.dataMode === "combined" ? "Total Score" : state.dataMode === "document" ? "Document Logic Score" : "Score";
    }

    function scoreForEnhancedRow(row) {
      if (!row) return null;
      return state.dataMode === "internal" ? row.internalScore : state.dataMode === "document" ? row.documentLogicScore : row.totalScore;
    }

    function matchedPropertyResidences(residences) {
      return residences.filter(function (residence) { return !!residence.propertyData; });
    }

    function reviewsForResidence(residenceId, reviews) {
      const items = reviews.filter(function (review) { return review.residenceId === residenceId; });
      return {
        items: items,
        reviewCount: items.reduce(function (sum, review) { return sum + Number(review.reviewCount || 0); }, 0),
        averageRating: weightedRating5(items)
      };
    }

    function formatNumber(value, digits) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
      return Number(value).toLocaleString("en-CA", { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
    }

    function formatPercent(value, digits) {
      return hasNumber(value) ? formatNumber(value, digits || 1) + "%" : "--";
    }

    function formatDaysFromMs(value) {
      return hasNumber(value) ? formatNumber(Number(value) / 86400000, 2) : "--";
    }

    function propertySourceLabel() {
      const validationSource = sampleData.validation?.propertyDataSourceFile;
      const source = validationSource || sampleData.propertyData?.sourceFile;
      const year = sampleData.propertyData?.year;
      return [source || "No property sheet found", year ? "Year " + year : ""].filter(Boolean).join(" · ");
    }

    function correlationDescription(value) {
      if (!hasNumber(value)) return "Not enough matched residences";
      const abs = Math.abs(Number(value));
      const strength = abs >= 0.7 ? "strong" : abs >= 0.4 ? "moderate" : abs >= 0.2 ? "weak" : "little";
      const direction = Number(value) > 0 ? "positive" : Number(value) < 0 ? "negative" : "no";
      return strength + " " + direction + " relationship";
    }

    function buildOptions() {
      const groups = ["All groups"].concat(reviewTrackersGroupRows().map(function (row) { return row.name; }));
      const sources = ["All sources"].concat([...new Set(sampleData.reviewSnapshots.filter(function (review) {
        return sourceWeightFor(review.source) > 0;
      }).map(function (review) { return review.source; }))].sort());
      setDropdown("group", groups.map(function (name) {
        return { value: name, label: name, subtitle: name === "All groups" ? "" : groupCount(name) + " locations" };
      }), state.group);
      setDropdown("source", sources.map(function (name) {
        return { value: name, label: name, subtitle: sourceCount(name) };
      }), state.source);
      setLocationOptions();
      document.getElementById("dateRangeLabel").textContent = dateLabel();
    }

    function setLocationOptions() {
      const residences = activeResidences().filter(function (residence) {
        return state.group === "All groups" || groupsForResidence(residence).includes(state.group);
      });
      const options = [{ label: "All locations", value: "All locations" }].concat(residences.map(function (residence) {
        return { label: residence.name, value: residence.id, subtitle: residence.city };
      }));
      setDropdown("location", options, state.location);
    }

    function reviewTrackersGroupRows() {
      const counts = {};
      activeResidences().forEach(function (residence) {
        groupsForResidence(residence).forEach(function (group) {
          counts[group] = (counts[group] || 0) + 1;
        });
      });
      return Object.entries(counts)
        .map(function ([name, count]) { return { name: name, count: count }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    function groupCount(group) {
      return activeResidences().filter(function (residence) { return groupsForResidence(residence).includes(group); }).length;
    }

    function sourceCount(source) {
      if (source === "All sources") return "";
      const total = sampleData.reviewSnapshots
        .filter(function (review) { return review.source === source && sourceWeightFor(review.source) > 0; })
        .reduce(function (sum, review) { return sum + Number(review.reviewCount || 0); }, 0);
      return total.toLocaleString("en-CA") + " reviews";
    }

    function setDropdown(kind, options, selected) {
      const trigger = document.getElementById(kind + "Trigger");
      const label = options.find(function (option) { return option.value === selected; })?.label || options[0]?.label || "";
      trigger.querySelector("span").textContent = label;
      document.getElementById(kind + "Options").innerHTML = options.map(function (option) {
        const isSelected = option.value === selected;
        return "<button class=\\"dropdown-option\\" type=\\"button\\" data-kind=\\"" + kind + "\\" data-value=\\"" + escapeHtml(option.value) + "\\">" +
          "<span class=\\"checkmark\\">" + (isSelected ? "✓" : "") + "</span>" +
          "<span><span class=\\"option-label\\">" + escapeHtml(option.label) + "</span>" +
          (option.subtitle ? "<span class=\\"option-subtitle\\">" + escapeHtml(option.subtitle) + "</span>" : "") +
          "</span></button>";
      }).join("");
    }

    function dateLabel() {
      const endDate = sampleData.publishedBefore || sampleData.asOfDate;
      const startDate = sampleData.publishedAfter;
      const end = new Date(endDate + "T00:00:00");
      const start = startDate ? new Date(startDate + "T00:00:00") : new Date(end);
      if (!startDate) start.setMonth(start.getMonth() - 6);
      return start.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) + " - " +
        end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      });
    }

    function renderSummary() {
      const residences = scopedResidences();
      const reviews = scopedReviews();
      const metrics = metricsFor(residences, reviews);
      const internalMode = state.dataMode === "internal";
      const combinedMode = state.dataMode === "combined";
      const documentMode = state.dataMode === "document";
      const showInternalCards = usesInternalData();
      document.getElementById("performanceScore").textContent = formatNumber(metrics.performanceScore, 0);
      document.getElementById("averageRating").textContent = formatNumber(metrics.averageRating, 2);
      document.getElementById("totalReviews").textContent = metrics.totalReviews.toLocaleString("en-CA");
      document.getElementById("responseRate").textContent = metrics.responseRate === null ? "--" : formatNumber(metrics.responseRate, 2) + "%";
      document.getElementById("responseTime").textContent = formatDaysFromMs(metrics.responseTimeMs);
      document.getElementById("totalScore").textContent = formatNumber(internalMode ? metrics.internalScore : metrics.totalScore, 0);
      document.getElementById("residentNps").textContent = formatNumber(metrics.residentNps, 0);
      document.getElementById("employeeNps").textContent = formatNumber(metrics.employeeNps, 0);
      document.getElementById("occupancyAverage").textContent = formatNumber(metrics.occupancyAverage, 1);
      document.getElementById("documentResidentExperience").textContent = formatNumber(metrics.residentExperience, 0);
      document.getElementById("documentEmployerBrand").textContent = formatNumber(metrics.employerBrand, 0);
      document.getElementById("documentNpsComponent").textContent = formatNumber(metrics.npsComponent, 0);
      document.getElementById("documentConfidence").textContent = metrics.confidence || "--";
      document.getElementById("performanceTitle").textContent = internalMode ? "Internal Score" : documentMode ? "Document Logic Score" : combinedMode ? "Total Score" : "Performance Score";
      document.getElementById("performanceDescription").textContent = internalMode
        ? "Resident and employee NPS from the property sheet"
        : documentMode
          ? "Resident Experience 70% + Employer Brand 20% + NPS 10%"
          : combinedMode
          ? "ReviewTrackers Performance Score + resident NPS + employee NPS"
          : "ReviewTrackers location performance score";
      document.getElementById("totalScoreLabel").textContent = internalMode ? "Internal Score" : "Total Score";
      document.getElementById("totalScoreDescription").textContent = internalMode ? "Resident NPS + employee NPS" : "ReviewTrackers + resident NPS + employee NPS";
      document.querySelectorAll("[data-external]").forEach(function (item) { item.hidden = internalMode || documentMode; });
      document.querySelectorAll("[data-enhanced]").forEach(function (item) { item.hidden = !showInternalCards || documentMode; });
      document.querySelectorAll("[data-document]").forEach(function (item) { item.hidden = !documentMode; });
      document.getElementById("dataModeNote").classList.add("active");
      document.getElementById("dataModeNoteTitle").textContent = internalMode ? "Spreadsheet:" : documentMode ? "Document Logic:" : combinedMode ? "Combined score:" : "ReviewTrackers:";
      document.getElementById("dataModeNoteBody").textContent = internalMode
        ? "Uses spreadsheet resident NPS, employee NPS, and occupancy only."
        : documentMode
          ? "Uses the Word document formula with NPS replacing Trust/Friction for V1."
          : combinedMode
          ? "Total Score uses ReviewTrackers Performance Score, resident NPS, and employee NPS."
          : "Uses ReviewTrackers metrics and performance score only.";
      document.querySelectorAll("[data-mode-button]").forEach(function (button) {
        const active = button.dataset.modeButton === state.dataMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function renderLeaderboard() {
      const residences = scopedResidences();
      const reviews = scopedReviews();
      const rows = state.view === "locations" ? locationRows(residences, reviews) : groupRows(residences, reviews);
      const columns = leaderboardColumns();
      document.getElementById("leaderHeaderRow").innerHTML = columns.map(function (column) {
        return "<th" + (column.key === "rank" ? " class=\\"rank-cell\\"" : "") + ">" + escapeHtml(column.label) + "</th>";
      }).join("");
      document.getElementById("leaderRows").innerHTML = rows.map(function (row, index) {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
        return "<tr>" + columns.map(function (column) {
          if (column.key === "rank") return "<td class=\\"rank-cell\\"><span class=\\"medal\\">" + medal + "</span>" + (index + 1) + "</td>";
          if (column.key === "name") return "<td><div class=\\"location-name\\">" + escapeHtml(row.name) + "</div><div class=\\"location-meta\\">" + escapeHtml(row.meta || "") + "</div></td>";
          return "<td class=\\"table-number\\">" + formatTableValue(row[column.key], column) + "</td>";
        }).join("") + "</tr>";
      }).join("");
    }

    function leaderboardColumns() {
      const nameLabel = state.view === "locations" ? "Location" : "Group";
      if (state.dataMode === "internal") {
        return [
          { key: "rank", label: "Rank" },
          { key: "name", label: nameLabel },
          { key: "mappedRegion", label: "ReviewTrackers Region", type: "text" },
          { key: "occupancy", label: "Occupancy", type: "percent" },
          { key: "residentNps", label: "Resident NPS", digits: 0 },
          { key: "employeeNps", label: "Employee NPS", digits: 0 },
          { key: "internalScore", label: "Internal Score", suffix: " / 100", digits: 0 }
        ];
      }
      if (state.dataMode === "combined") {
        return [
          { key: "rank", label: "Rank" },
          { key: "name", label: nameLabel },
          { key: "reviewTrackersScore", label: "ReviewTrackers Score", suffix: " / 100", digits: 0 },
          { key: "residentNps", label: "Resident NPS", digits: 0 },
          { key: "employeeNps", label: "Employee NPS", digits: 0 },
          { key: "occupancy", label: "Occupancy", type: "percent" },
          { key: "totalScore", label: "Total Score", suffix: " / 100", digits: 0 }
        ];
      }
      if (state.dataMode === "document") {
        return [
          { key: "rank", label: "Rank" },
          { key: "name", label: nameLabel },
          { key: "residentExperience", label: "Resident Experience", suffix: " / 100", digits: 0 },
          { key: "employerBrand", label: "Employer Brand", suffix: " / 100", digits: 0 },
          { key: "npsComponent", label: "NPS Component", suffix: " / 100", digits: 0 },
          { key: "reviewCount", label: "Reviews", digits: 0 },
          { key: "sourceCount", label: "Sources", digits: 0 },
          { key: "confidence", label: "Confidence", type: "text" },
          { key: "documentLogicScore", label: "Document Logic Score", suffix: " / 100", digits: 0 }
        ];
      }
      return [
        { key: "rank", label: "Rank" },
        { key: "name", label: nameLabel },
        { key: "averageRating", label: "Average Rating", digits: 2 },
        { key: "reviewCount", label: "Reviews", digits: 0 },
        { key: "responseRate", label: "Response Rate", type: "percent" },
        { key: "reviewTrackersScore", label: "Score", suffix: " / 100", digits: 0 }
      ];
    }

    function formatTableValue(value, column) {
      if (column.type === "text") return escapeHtml(value || "--");
      if (column.type === "percent") return formatPercent(value, 1);
      return formatNumber(value, column.digits || 0) + (hasNumber(value) ? column.suffix || "" : "");
    }

    function locationRows(residences, reviews) {
      return residences.map(function (residence) {
        const enhanced = enhancedForResidence(residence, reviews);
        const reviewSummary = reviewsForResidence(residence.id, reviews);
        const residentExperience = residentExperienceForReviews(reviewSummary.items);
        const employerBrand = employerBrandScore();
        const npsComponent = enhanced?.npsComponent ?? null;
        const documentScore = documentLogicScore(residentExperience.score, employerBrand, npsComponent);
        return {
          name: residence.name,
          meta: usesInternalData() && enhanced ? [residence.city, enhanced.propertyRegion].filter(Boolean).join(" · ") : residence.city,
          propertyRegion: enhanced?.propertyRegion,
          mappedRegion: enhanced?.mappedRegion,
          occupancy: enhanced?.occupancy,
          residentNps: enhanced?.residentNps,
          employeeNps: enhanced?.employeeNps,
          internalScore: enhanced?.internalScore,
          totalScore: enhanced?.totalScore,
          residentExperience: residentExperience.score,
          employerBrand: employerBrand,
          npsComponent: npsComponent,
          sourceCount: residentExperience.sourceCount,
          confidence: residentExperience.confidence,
          documentLogicScore: documentScore,
          reviewTrackersScore: reviewTrackersScoreFor(residence, reviews),
          averageRating: reviewSummary.averageRating,
          reviewCount: reviewSummary.reviewCount,
          responseRate: residence.reviewTrackersResponseRate,
          score: state.dataMode === "document" ? documentScore : usesInternalData() ? scoreForEnhancedRow(enhanced) : reviewTrackersScoreFor(residence, reviews)
        };
      }).sort(function (a, b) { return (b.score ?? -1) - (a.score ?? -1); });
    }

    function groupRows(residences, reviews) {
      const groups = [...new Set(residences.flatMap(groupsForResidence))];
      return groups.map(function (group) {
        const groupResidences = residences.filter(function (residence) { return groupsForResidence(residence).includes(group); });
        const groupIds = new Set(groupResidences.map(function (residence) { return residence.id; }));
        const groupReviews = reviews.filter(function (review) { return groupIds.has(review.residenceId); });
        const enhancedRows = enhancedRowsFor(groupResidences, groupReviews);
        const residentExperience = residentExperienceForReviews(groupReviews);
        const employerBrand = employerBrandScore();
        const npsComponent = averageNumbers(enhancedRows.map(function (row) { return row.npsComponent; }));
        const documentScore = documentLogicScore(residentExperience.score, employerBrand, npsComponent);
        const score = usesInternalData()
          ? state.dataMode === "document" ? documentScore : averageNumbers(enhancedRows.map(scoreForEnhancedRow))
          : weightedAverage(groupResidences.map(function (residence) {
            return { value: residence.reviewTrackersPerformanceScore, weight: reviewsForResidence(residence.id, groupReviews).reviewCount || 1 };
          }));
        const meta = usesInternalData()
          ? groupResidences.length + " locations · " + enhancedRows.length + " matched"
          : groupResidences.length + " locations";
        return {
          name: group,
          meta: meta,
          mappedRegion: group,
          occupancy: averageNumbers(enhancedRows.map(function (row) { return row.occupancy; })),
          residentNps: averageNumbers(enhancedRows.map(function (row) { return row.residentNps; })),
          employeeNps: averageNumbers(enhancedRows.map(function (row) { return row.employeeNps; })),
          internalScore: averageNumbers(enhancedRows.map(function (row) { return row.internalScore; })),
          totalScore: averageNumbers(enhancedRows.map(function (row) { return row.totalScore; })),
          residentExperience: residentExperience.score,
          employerBrand: employerBrand,
          npsComponent: npsComponent,
          sourceCount: residentExperience.sourceCount,
          confidence: residentExperience.confidence,
          documentLogicScore: documentScore,
          reviewTrackersScore: weightedAverage(groupResidences.map(function (residence) {
            return { value: residence.reviewTrackersPerformanceScore, weight: reviewsForResidence(residence.id, groupReviews).reviewCount || 1 };
          })),
          averageRating: weightedRating5(groupReviews),
          reviewCount: groupReviews.reduce(function (sum, review) { return sum + Number(review.reviewCount || 0); }, 0),
          responseRate: weightedAverage(groupResidences.map(function (residence) {
            return { value: residence.reviewTrackersResponseRate, weight: reviewsForResidence(residence.id, groupReviews).reviewCount || 1 };
          })),
          score: score
        };
      }).sort(function (a, b) { return (b.score ?? -1) - (a.score ?? -1); });
    }

    function renderEnhancedPanel() {
      const panel = document.getElementById("enhancedPanel");
      panel.hidden = !usesInternalData();
      if (!usesInternalData()) return;

      const residences = scopedResidences();
      const reviews = scopedReviews();
      const propertyMatched = matchedPropertyResidences(residences);
      const unmatched = residences.filter(function (residence) { return !residence.propertyData; });
      const rows = enhancedRowsFor(residences, reviews).sort(function (a, b) {
        return (scoreForEnhancedRow(b) ?? -1) - (scoreForEnhancedRow(a) ?? -1);
      });
      const correlationRows = rows.filter(function (row) { return hasNumber(row.occupancy) && hasNumber(scoreForEnhancedRow(row)); });
      const correlation = pearsonCorrelation(correlationRows);

      document.getElementById("diagnosticActive").textContent = residences.length.toLocaleString("en-CA");
      document.getElementById("diagnosticMatched").textContent = propertyMatched.length.toLocaleString("en-CA");
      document.getElementById("diagnosticUnmatched").textContent = unmatched.length.toLocaleString("en-CA");
      document.getElementById("correlationValue").textContent = hasNumber(correlation) ? correlation.toFixed(2) : "--";
      document.getElementById("correlationLabel").textContent = "Occupancy vs. " + modeScoreLabel() + " · " + correlationDescription(correlation) + " · " + correlationRows.length.toLocaleString("en-CA") + " residences";
      document.getElementById("propertySourceLabel").textContent = propertySourceLabel();
      document.getElementById("enhancedPanelTitle").textContent = state.dataMode === "internal"
        ? "Internal Data Analysis"
        : state.dataMode === "document"
          ? "Document Logic Analysis"
          : "Combined Data Analysis";
      document.getElementById("enhancedPanelCopy").textContent = state.dataMode === "internal"
        ? "Uses matched property sheet rows for resident NPS, employee NPS, occupancy, and Internal Score."
        : state.dataMode === "document"
          ? "Uses the Word document formula with corporate employer data and NPS replacing Trust/Friction for V1."
          : "Uses matched property sheet rows with ReviewTrackers Performance Score for Total Score.";
      document.getElementById("formulaTitle").textContent = state.dataMode === "internal"
        ? "Internal Score formula"
        : state.dataMode === "document"
          ? "Document Logic formula"
          : "Total Score formula";
      document.getElementById("formulaCopy").textContent = state.dataMode === "internal"
        ? "Average of resident NPS and employee NPS after both are normalized to 0-100."
        : state.dataMode === "document"
          ? "Resident Experience 70% + Employer Brand 20% + NPS Component 10%."
          : "Average of ReviewTrackers Performance Score, resident NPS normalized to 0-100, and employee NPS normalized to 0-100.";

      const unmatchedList = document.getElementById("unmatchedList");
      unmatchedList.hidden = unmatched.length === 0;
      unmatchedList.innerHTML = unmatched.length
        ? "<h3>Unmatched residences</h3><ul>" + unmatched.map(function (residence) {
          return "<li>" + escapeHtml(residence.name) + "</li>";
        }).join("") + "</ul>"
        : "";
    }

    function render() {
      buildOptions();
      renderSummary();
      renderLeaderboard();
      renderEnhancedPanel();
    }

    function openDropdown(kind) {
      ["group", "location", "source"].forEach(function (item) {
        const isOpen = item === kind;
        document.getElementById(item + "Dropdown").hidden = !isOpen;
        document.getElementById(item + "Trigger").setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
          const search = document.getElementById(item + "Search");
          if (search) {
            search.value = "";
            filterDropdown(item, "");
            setTimeout(function () { search.focus(); }, 0);
          }
        }
      });
    }

    function closeDropdowns() {
      ["group", "location", "source"].forEach(function (item) {
        document.getElementById(item + "Dropdown").hidden = true;
        document.getElementById(item + "Trigger").setAttribute("aria-expanded", "false");
      });
    }

    function filterDropdown(kind, query) {
      const normalized = query.trim().toLowerCase();
      document.querySelectorAll("[data-kind='" + kind + "']").forEach(function (option) {
        option.hidden = normalized && !option.textContent.toLowerCase().includes(normalized);
      });
    }

    ["group", "location", "source"].forEach(function (kind) {
      document.getElementById(kind + "Trigger").addEventListener("click", function (event) {
        event.stopPropagation();
        openDropdown(kind);
      });
      const search = document.getElementById(kind + "Search");
      if (search) {
        search.addEventListener("input", function (event) { filterDropdown(kind, event.target.value); });
        search.addEventListener("click", function (event) { event.stopPropagation(); });
      }
    });

    document.addEventListener("click", function (event) {
      const option = event.target.closest(".dropdown-option");
      if (option) {
        const kind = option.dataset.kind;
        const value = option.dataset.value;
        if (kind === "group") {
          state.group = value;
          state.location = "All locations";
        } else if (kind === "location") {
          state.location = value;
        } else if (kind === "source") {
          state.source = value;
        }
        closeDropdowns();
        render();
        return;
      }
      if (!event.target.closest(".custom-select")) closeDropdowns();
    });

    document.getElementById("clearAll").addEventListener("click", function (event) {
      event.preventDefault();
      state.group = "All groups";
      state.location = "All locations";
      state.source = "All sources";
      state.dataMode = "external";
      render();
    });
    document.querySelectorAll("[data-mode-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.dataMode = this.dataset.modeButton;
        render();
      });
    });
    document.getElementById("locationsTab").addEventListener("click", function () {
      state.view = "locations";
      document.getElementById("locationsTab").classList.add("active");
      document.getElementById("groupsTab").classList.remove("active");
      renderLeaderboard();
    });
    document.getElementById("groupsTab").addEventListener("click", function () {
      state.view = "groups";
      document.getElementById("groupsTab").classList.add("active");
      document.getElementById("locationsTab").classList.remove("active");
      renderLeaderboard();
    });

    render();
  </script>
</body>
</html>
`;

fs.writeFileSync("Brand Composite Score.html", html);
console.log("Wrote Brand Composite Score.html");
