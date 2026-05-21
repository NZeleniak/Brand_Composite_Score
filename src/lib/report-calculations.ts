import type {
  ConfidenceGrade,
  EmployerBrandItem,
  ReportData,
  Residence,
  ResidenceScore,
  ReviewSnapshot,
  TrustFriction,
} from "@/lib/report-types";

export const sourceWeights: Record<string, number> = {
  Google: 1,
  Yelp: 0.8,
  Facebook: 0.7,
  SeniorAdvisor: 0.6,
  APlaceForMom: 0.6,
  Caring: 0.6,
};

export const residenceSources = new Set(Object.keys(sourceWeights));
export const confidenceRank: Record<ConfidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1 };
export const confidenceLabel: Record<number, ConfidenceGrade> = { 4: "A", 3: "B", 2: "C", 1: "D" };

export function regionForResidence(residence: Residence) {
  return residence.operatingRegion || residence.region || "Unmapped";
}

export function regionsForReport(data: ReportData) {
  const regions = new Set(
    data.residences.filter((item) => item.active).map((item) => regionForResidence(item)),
  );
  return ["All Regions", ...[...regions].sort((a, b) => a.localeCompare(b))];
}

export function monthsBetween(fromDate: string, toDate: string) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function normalizedRating(item: { ratingRaw: number; ratingScale: number }) {
  return (Number(item.ratingRaw) / Number(item.ratingScale)) * 100;
}

export function volumeWeight(count: number) {
  return Math.log(1 + Number(count || 0));
}

export function recencyWeight(lastReviewDate: string, snapshotDate: string) {
  const age = monthsBetween(lastReviewDate, snapshotDate);
  if (age <= 12) return 1;
  if (age <= 24) return 0.7;
  return 0.5;
}

export function weightedAverage<T extends { ratingRaw: number; ratingScale: number }>(
  items: T[],
  weightFn: (item: T) => number,
) {
  const totals = items.reduce(
    (acc, item) => {
      const weight = weightFn(item);
      acc.weighted += normalizedRating(item) * weight;
      acc.weight += weight;
      return acc;
    },
    { weighted: 0, weight: 0 },
  );
  return totals.weight ? totals.weighted / totals.weight : 0;
}

export function confidenceGrade(totalReviews: number, distinctSources: number): ConfidenceGrade {
  if (totalReviews >= 120 && distinctSources >= 2) return "A";
  if (totalReviews >= 60 && totalReviews <= 119 && distinctSources >= 2) return "B";
  if ((totalReviews >= 20 && totalReviews <= 59) || distinctSources === 1) return "C";
  return "D";
}

export function scoreBand(score: number) {
  if (score >= 90) return "Category leader";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Watch";
  if (score >= 60) return "Brand risk";
  return "Structural issue";
}

export function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(Number(value)));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + Number(value), 0) / usable.length;
}

export function calculateResidenceScores(data: ReportData, region = "All Regions"): ResidenceScore[] {
  const activeResidences = data.residences.filter((residence) => residence.active);
  const filteredResidences =
    region === "All Regions"
      ? activeResidences
      : activeResidences.filter((residence) => regionForResidence(residence) === region);

  return filteredResidences
    .map((residence) => {
      const reviews = data.reviewSnapshots.filter((review) => {
        return review.residenceId === residence.id && residenceSources.has(review.source);
      });
      const totalReviews = reviews.reduce((sum, review) => sum + review.reviewCount, 0);
      const distinctSources = new Set(reviews.map((review) => review.source)).size;
      const experienceScore = weightedAverage(reviews, (review: ReviewSnapshot) => {
        return (
          volumeWeight(review.reviewCount) *
          recencyWeight(review.lastReviewDate, review.snapshotDate) *
          (sourceWeights[review.source] || 0.5)
        );
      });
      const googleReviews = reviews.filter((review) => review.source === "Google");
      const googleOnly = googleReviews.length
        ? weightedAverage(googleReviews, (review) => volumeWeight(review.reviewCount))
        : 0;

      return {
        ...residence,
        experienceScore,
        googleOnly,
        delta: experienceScore - googleOnly,
        totalReviews,
        distinctSources,
        sources: reviews.map((review) => review.source),
        confidence: confidenceGrade(totalReviews, distinctSources),
      };
    })
    .sort((a, b) => b.experienceScore - a.experienceScore);
}

export function portfolioResidentScore(residences: ResidenceScore[]) {
  const totals = residences.reduce(
    (acc, residence) => {
      const weight = volumeWeight(residence.totalReviews);
      acc.weighted += residence.experienceScore * weight;
      acc.weight += weight;
      return acc;
    },
    { weighted: 0, weight: 0 },
  );
  return totals.weight ? totals.weighted / totals.weight : 0;
}

export function googleOnlyPortfolioScore(residences: ResidenceScore[]) {
  const totals = residences.reduce(
    (acc, residence) => {
      if (!residence.googleOnly) return acc;
      const weight = volumeWeight(residence.totalReviews);
      acc.weighted += residence.googleOnly * weight;
      acc.weight += weight;
      return acc;
    },
    { weighted: 0, weight: 0 },
  );
  return totals.weight ? totals.weighted / totals.weight : 0;
}

export function employerScore(items: EmployerBrandItem[]) {
  return weightedAverage(items, (item) => volumeWeight(item.reviewCount));
}

export function trustFrictionScore(trust: TrustFriction) {
  const bbbScore = (trust.bbbRatingRaw / trust.bbbRatingScale) * 100;
  const complaintPenalty = Math.min(18, trust.complaintCount * 0.45);
  return Math.max(0, bbbScore - complaintPenalty);
}

export function compositeScore(resident: number, employer: number, trust: number) {
  return resident * 0.7 + employer * 0.2 + trust * 0.1;
}

export function buildRegionalData(data: ReportData) {
  return regionsForReport(data)
    .filter((region) => region !== "All Regions")
    .map((region) => {
      const scores = calculateResidenceScores(data, region);
      return {
        region,
        score: portfolioResidentScore(scores),
        count: scores.length,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function summarizeSources(data: ReportData, residences: ResidenceScore[]) {
  const residenceIds = new Set(residences.map((residence) => residence.id));
  const counts = data.reviewSnapshots
    .filter((review) => residenceSources.has(review.source))
    .filter((review) => residenceIds.has(review.residenceId))
    .reduce<Record<string, number>>((acc, review) => {
      acc[review.source] = (acc[review.source] || 0) + review.reviewCount;
      return acc;
    }, {});
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
