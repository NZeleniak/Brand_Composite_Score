"use client";

import Link from "next/link";
import { Home, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  active: "report" | "documentation";
  children?: React.ReactNode;
};

export function AppHeader({ active, children }: AppHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 md:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Home className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-bold">Chartwell Brand Intelligence</p>
          <p className="text-sm text-muted-foreground">
            {active === "report" ? "Next.js report using refreshed ReviewTrackers data" : "Documentation and operating runbook"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="inline-flex rounded-lg border bg-card p-1 shadow-sm" aria-label="Report pages">
          <Button asChild size="sm" variant={active === "report" ? "default" : "ghost"}>
            <Link href="/">Report</Link>
          </Button>
          <Button asChild size="sm" variant={active === "documentation" ? "default" : "ghost"}>
            <Link href="/documentation">Documentation</Link>
          </Button>
        </nav>
        {children}
        {active === "report" ? (
          <Button type="button" size="sm" onClick={() => globalThis.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Print
          </Button>
        ) : null}
      </div>
    </header>
  );
}
