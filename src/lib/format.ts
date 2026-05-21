export function formatNumber(value: number, digits = 0) {
  return Number(value).toLocaleString("en-CA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatMaybe(value: number | null | undefined, digits = 0, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${formatNumber(value, digits)}${suffix}`;
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function deltaClass(delta: number) {
  return delta >= 0 ? "text-[var(--chart-4)]" : "text-destructive";
}

export function signedNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value) >= 0 ? "+" : ""}${formatNumber(Number(value), digits)}`;
}
