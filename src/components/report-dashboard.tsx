"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Database, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BarList, TrendChart } from "@/components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildRegionalData,
  calculateResidenceScores,
  compositeScore,
  confidenceLabel,
  confidenceRank,
  employerScore,
  googleOnlyPortfolioScore,
  portfolioResidentScore,
  regionForResidence,
  regionsForReport,
  scoreBand,
  summarizeSources,
  trustFrictionScore,
} from "@/lib/report-calculations";
import { deltaClass, formatCurrency, formatMaybe, formatNumber, signedNumber } from "@/lib/format";
import type { ConfidenceGrade, ReportData } from "@/lib/report-types";

export function ReportDashboard({ data }: { data: ReportData }) {
  const [region, setRegion] = useState("All Regions");
  const regionOptions = useMemo(() => regionsForReport(data), [data]);
  const residences = useMemo(() => calculateResidenceScores(data, region), [data, region]);
  const resident = portfolioResidentScore(residences);
  const employer = employerScore(data.employerBrand);
  const trust = trustFrictionScore(data.trustFriction);
  const composite = resident;
  const google = googleOnlyPortfolioScore(residences);
  const totalReviews = residences.reduce((sum, residence) => sum + residence.totalReviews, 0);
  const avgConfidenceScore =
    residences.reduce((sum, residence) => sum + confidenceRank[residence.confidence], 0) / Math.max(residences.length, 1);
  const avgConfidenceGrade = confidenceLabel[Math.round(avgConfidenceScore)] || "D";
  const propertyMatches = residences.filter((residence) => residence.propertyData);
  const regionalRows = buildRegionalData(data).map((item) => ({
    name: item.region,
    value: item.score,
    display: formatNumber(item.score, 1),
  }));
  const confidenceRows = (["A", "B", "C", "D"] as ConfidenceGrade[]).map((grade) => ({
    name: `Grade ${grade}`,
    value: residences.filter((residence) => residence.confidence === grade).length,
    display: String(residences.filter((residence) => residence.confidence === grade).length),
  }));
  const sourceRows = summarizeSources(data, residences).map((row) => ({
    name: row.name,
    value: row.value,
    display: row.value.toLocaleString("en-CA"),
  }));
  const trendRows = data.monthlyTrend.map((item) => ({
    month: item.month,
    score: item.residentExperience ?? composite,
  }));

  return (
    <>
      <AppHeader active="report">
        <div className="flex min-w-[250px] items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Region</span>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent px-0 font-bold shadow-none focus:ring-0">
              <SelectValue className="sr-only" />
              <span className="truncate text-left">{region}</span>
            </SelectTrigger>
            <SelectContent>
              {regionOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AppHeader>

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="bg-gradient-to-br from-white to-accent">
            <CardContent className="p-8 md:p-10">
              <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
                Brand Composite Score
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                A decision-grade reputation metric that turns public review signals into a resident experience score,
                with confidence, review volume, recency, source mix, and property data shown beside the result.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[radial-gradient(circle_at_85%_12%,rgba(0,90,156,0.12),transparent_28%),white]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Resident Experience</CardTitle>
                <p className="text-xs text-muted-foreground">Primary V1 score. Employer and trust inputs are tracked as placeholders.</p>
              </div>
              <p className="text-sm font-semibold">As of {data.asOfDate}</p>
            </CardHeader>
            <CardContent>
              <div className="grid place-items-center py-3">
                <div
                  className="grid aspect-square w-56 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#9d0f63 ${Math.max(0, Math.min(100, composite)) * 3.6}deg, #ede6ed 0)` }}
                >
                  <div className="grid aspect-square w-[calc(100%-26px)] place-items-center rounded-full border bg-card text-center">
                    <div>
                      <div className="text-6xl font-extrabold text-primary">{formatNumber(composite, 1)}</div>
                      <div className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{scoreBand(composite)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricPill value={formatNumber(resident, 1)} label="Resident experience" />
                <MetricPill value={formatNumber(employer, 1)} label="Employer placeholder" />
                <MetricPill value={formatNumber(trust, 1)} label="Trust placeholder" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <SectionHeader
            title="Executive Overview"
            note="The headline V1 score excludes placeholder employer/trust data until real corporate and trust sources are connected."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Residences" value={residences.length.toLocaleString("en-CA")} caption={region === "All Regions" ? "Active residences in scope" : `${region} residences in scope`} />
            <KpiCard label="Public reviews" value={totalReviews.toLocaleString("en-CA")} caption="Across primary residence review sources" />
            <KpiCard label="Avg confidence" value={avgConfidenceGrade} caption="Based on volume and source coverage" />
            <KpiCard label="Google delta" value={signedNumber(composite - google, 1)} caption="Resident score vs Google-only score" danger={composite - google < 0} />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Signal Views" note="Every view recalculates from the selected operating-region subset." />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Resident Experience Trend" eyebrow="Monthly sample">
              <TrendChart rows={trendRows} />
            </ChartCard>
            <ChartCard title="Regional Comparison" eyebrow="Resident score">
              <BarList rows={regionalRows} min={70} max={100} />
            </ChartCard>
            <ChartCard title="Confidence Distribution" eyebrow="Residences">
              <BarList rows={confidenceRows} digits={0} />
            </ChartCard>
            <ChartCard title="Source Coverage" eyebrow="Public reviews">
              <BarList rows={sourceRows} digits={0} />
            </ChartCard>
          </div>
        </section>

        <PropertySection data={data} residences={residences} propertyMatches={propertyMatches} />
        <LeaderboardSection residences={residences} />
        <MethodologySection data={data} compositePreview={compositeScore(resident, employer, trust)} />
      </main>
    </>
  );
}

function MetricPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {note ? <p className="max-w-2xl text-sm text-muted-foreground md:text-right">{note}</p> : null}
    </div>
  );
}

function KpiCard({ label, value, caption, danger }: { label: string; value: string; caption: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-3 text-4xl font-extrabold ${danger ? "text-destructive" : ""}`}>{value}</div>
        <p className="mt-3 text-sm text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        <span className="text-xs font-bold text-muted-foreground">{eyebrow}</span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PropertySection({
  data,
  residences,
  propertyMatches,
}: {
  data: ReportData;
  residences: ReturnType<typeof calculateResidenceScores>;
  propertyMatches: ReturnType<typeof calculateResidenceScores>;
}) {
  return (
    <section className="mt-8">
      <SectionHeader
        title="Property Data Sheet"
        note={`${data.propertyData?.sourceFile || "No Property_Data_Sheet_YYYY.csv found"} joined to ${propertyMatches.length} of ${residences.length} filtered residences.`}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Matched rows" value={propertyMatches.length.toLocaleString("en-CA")} caption="Property sheet rows joined by residence name" />
        <KpiCard label="Avg occupancy" value={formatMaybe(averageValue(propertyMatches.map((residence) => residence.propertyData?.occupancyAverage)), 1, "%")} caption="Average of monthly occupancy fields" />
        <KpiCard label="Resident NPS" value={formatMaybe(averageValue(propertyMatches.map((residence) => residence.propertyData?.residentNps)), 1)} caption="Filtered property sheet average" />
        <KpiCard label="Employee NPS" value={formatMaybe(averageValue(propertyMatches.map((residence) => residence.propertyData?.employeeNps)), 1)} caption="Filtered property sheet average" />
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Residence</TableHead>
                <TableHead>Operating region</TableHead>
                <TableHead>Property region</TableHead>
                <TableHead className="text-right">Resident NPS</TableHead>
                <TableHead className="text-right">Employee NPS</TableHead>
                <TableHead className="text-right">RSS current</TableHead>
                <TableHead className="text-right">RSS change</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Monthly budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertyMatches
                .toSorted((a, b) => regionForResidence(a).localeCompare(regionForResidence(b)) || a.name.localeCompare(b.name))
                .map((residence) => {
                  const property = residence.propertyData;
                  if (!property) return null;
                  return (
                    <TableRow key={residence.id}>
                      <TableCell>
                        <div className="font-semibold">{residence.name}</div>
                        <div className="text-sm text-muted-foreground">{residence.city}</div>
                      </TableCell>
                      <TableCell>{regionForResidence(residence)}</TableCell>
                      <TableCell>{property.propertyRegion || "--"}</TableCell>
                      <TableCell className="text-right">{formatMaybe(property.residentNps, 1)}</TableCell>
                      <TableCell className="text-right">{formatMaybe(property.employeeNps, 1)}</TableCell>
                      <TableCell className="text-right">{formatMaybe(property.rssOverallCurrentYear, 1)}</TableCell>
                      <TableCell className={`text-right font-bold ${deltaClass(property.rssOverallChange || 0)}`}>{signedNumber(property.rssOverallChange, 1)}</TableCell>
                      <TableCell className="text-right">{formatMaybe(property.occupancyAverage, 1, "%")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(property.monthlyBudget)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function LeaderboardSection({ residences }: { residences: ReturnType<typeof calculateResidenceScores> }) {
  return (
    <section className="mt-8">
      <SectionHeader title="Residence Leaderboard" note="Sorted by resident experience score within the selected operating-region filter." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Residence</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Care type</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Google</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead className="text-right">Reviews</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Band</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residences.map((residence) => (
                <TableRow key={residence.id}>
                  <TableCell>
                    <div className="font-semibold">{residence.name}</div>
                    <div className="text-sm text-muted-foreground">{residence.city}</div>
                  </TableCell>
                  <TableCell>{regionForResidence(residence)}</TableCell>
                  <TableCell>{residence.careType || "--"}</TableCell>
                  <TableCell className="text-right">
                    <Badge>{formatNumber(residence.experienceScore, 1)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(residence.googleOnly, 1)}</TableCell>
                  <TableCell className={`text-right font-bold ${deltaClass(residence.delta)}`}>{signedNumber(residence.delta, 1)}</TableCell>
                  <TableCell className="text-right">{residence.totalReviews.toLocaleString("en-CA")}</TableCell>
                  <TableCell>{residence.sources.join(", ") || "--"}</TableCell>
                  <TableCell>
                    <Badge variant={residence.confidence === "D" ? "destructive" : "secondary"}>{residence.confidence}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{scoreBand(residence.experienceScore)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function MethodologySection({ data, compositePreview }: { data: ReportData; compositePreview: number }) {
  return (
    <section className="mt-8">
      <SectionHeader title="Methodology Appendix" note="Current V1 deploys generated JSON only; ReviewTrackers credentials remain local." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="size-4" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Report data is read from <code>data/reviewtrackers-report-data.json</code>.</p>
            <p>Refresh locally with <code>npm run refresh:data</code>, then deploy to Vercel.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="size-4" />
              Residence Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Residence scoring uses Google, Yelp, Facebook, SeniorAdvisor, A Place for Mom, and Caring.</p>
            <p>Excluded non-residence sources: {Object.entries(data.validation?.excludedNonResidenceSources || {}).map(([name, count]) => `${name} ${count}`).join(", ") || "none"}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-4" />
              Placeholder Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Employer and trust scores remain visible for governance, but are not used in the V1 headline score.</p>
            <p>Legacy composite preview with placeholders: {formatNumber(compositePreview, 1)}.</p>
          </CardContent>
        </Card>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="size-4" />
            Refresh Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
          <p>Total residences: <strong className="text-foreground">{data.validation?.totalResidences ?? data.residences.length}</strong></p>
          <p>Total snapshots: <strong className="text-foreground">{data.validation?.totalReviewSnapshots ?? data.reviewSnapshots.length}</strong></p>
          <p>Unmapped: <strong className="text-foreground">{data.validation?.unmappedCount ?? 0}</strong></p>
          <p>Property matches: <strong className="text-foreground">{data.validation?.propertyMatches ?? 0}</strong></p>
        </CardContent>
      </Card>
    </section>
  );
}

function averageValue(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(Number(value)));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}
