import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DocumentationPage() {
  return (
    <>
      <AppHeader active="documentation" />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 md:px-6">
        <section className="rounded-lg border bg-gradient-to-br from-white to-accent p-8 shadow-sm md:p-10">
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.98] tracking-tight md:text-7xl">
            Brand Composite Score Documentation
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            This Next.js V1 keeps the report deployable on Vercel while preserving the local ReviewTrackers refresh workflow.
            Credentials are used only by local scripts and are never shipped to the browser.
          </p>
        </section>

        <Section title="How It Works" note="The app is real Next.js, but the data source remains generated JSON for V1.">
          <InfoCard title="Report Page">
            <p>The <code>/</code> route renders the dashboard from <code>data/reviewtrackers-report-data.json</code>.</p>
            <p>Region filters and all score cards recalculate in the browser from that generated data.</p>
          </InfoCard>
          <InfoCard title="Documentation Page">
            <p>The <code>/documentation</code> route explains scripts, environment values, deployment, and the manual property sheet flow.</p>
          </InfoCard>
          <InfoCard title="No Database">
            <p>V1 does not use Snowflake, Vercel Blob, KV, or a live API refresh button.</p>
            <p>When you want in-app refresh later, add Blob/KV storage first.</p>
          </InfoCard>
        </Section>

        <Section title="Local Commands" note="Run these from the project folder before deploying updated data.">
          <CommandCard title="Install and Run">
            npm install{"\n"}npm run dev
          </CommandCard>
          <CommandCard title="ReviewTrackers Token">
            npm run auth:reviewtrackers{"\n"}npm run validate:reviewtrackers
          </CommandCard>
          <CommandCard title="Refresh Report Data">
            npm run refresh:data{"\n"}npm run typecheck{"\n"}npm run build
          </CommandCard>
        </Section>

        <Section title="Environment Values" note="Keep real credentials in .env.local or .env on your machine only.">
          <InfoCard title="Required">
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs text-foreground">
{`REVIEWTRACKERS_EMAIL=your.email@chartwell.com
REVIEWTRACKERS_PASSWORD=your_password`}
            </pre>
          </InfoCard>
          <InfoCard title="Optional">
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs text-foreground">
{`REVIEWTRACKERS_TOKEN=existing_token
REVIEWTRACKERS_ACCOUNT_ID=account_id`}
            </pre>
          </InfoCard>
          <InfoCard title="Do Not Commit">
            <p><code>.env</code>, <code>.env.local</code>, <code>reviewtrackers-token.json</code>, and <code>Property_Data_Sheet_*.csv</code> are ignored by git.</p>
          </InfoCard>
        </Section>

        <Section title="Property Sheet Flow" note="The yearly file is manually replaced before refresh.">
          <InfoCard title="Naming">
            <p>Use <code>Property_Data_Sheet_2026.csv</code>, then update the year for future files.</p>
          </InfoCard>
          <InfoCard title="Discovery">
            <p>The refresh script looks in the project folder, <code>data/</code>, and your Downloads folder, then chooses the newest matching year.</p>
          </InfoCard>
          <InfoCard title="Override">
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs text-foreground">
{`npm run refresh:data -- --property-data-sheet "C:\\path\\to\\Property_Data_Sheet_2026.csv"`}
            </pre>
          </InfoCard>
        </Section>

        <Section title="Deployment" note="Vercel should protect the app with deployment protection or team access.">
          <InfoCard title="Before Deploy">
            <p>Run <code>npm run refresh:data</code>, then <code>npm run build</code>.</p>
          </InfoCard>
          <InfoCard title="Push to GitHub">
            <p>Commit the Next.js app files and generated JSON. Do not commit local credentials or token files.</p>
          </InfoCard>
          <InfoCard title="Vercel">
            <p>Import the GitHub repo as a Next.js project. No ReviewTrackers environment values are required for V1 runtime.</p>
          </InfoCard>
        </Section>
      </main>
    </>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-right">{note}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">{children}</div>
      <Separator className="mt-8" />
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function CommandCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs text-foreground">{children}</pre>
      </CardContent>
    </Card>
  );
}
