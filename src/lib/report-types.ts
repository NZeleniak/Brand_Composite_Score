export type PropertyData = {
  year: number;
  propertyNumber: string;
  propertyNumberAlt: string;
  propertyRegion: string;
  residenceName: string;
  residentSatisfaction: number | null;
  residentNps: number | null;
  employeeEngagement: number | null;
  employeeNps: number | null;
  rssOverallPriorYear: number | null;
  rssOverallCurrentYear: number | null;
  rssOverallChange: number | null;
  rssStaffPriorYear: number | null;
  rssStaffCurrentYear: number | null;
  rssStaffChange: number | null;
  rssLifestylePriorYear: number | null;
  rssLifestyleCurrentYear: number | null;
  rssLifestyleChange: number | null;
  lifestyleProgramsManagerHours: number | null;
  activityAideHours: number | null;
  driverHours: number | null;
  monthlyBudget: number | null;
  occupancyAverage: number | null;
  occupancyMonthly: Record<string, number | null>;
};

export type Residence = {
  id: string;
  reviewtrackersLocationId?: string;
  name: string;
  city: string;
  region: string;
  operatingRegion?: string;
  groups?: string[];
  careType?: string;
  active: boolean;
  reviewTrackersPerformanceScore?: number | null;
  reviewTrackersResponseRate?: number | null;
  propertyData?: PropertyData | null;
};

export type ReviewSnapshot = {
  residenceId: string;
  residenceName?: string;
  source: string;
  ratingRaw: number;
  ratingScale: number;
  reviewCount: number;
  lastReviewDate: string;
  snapshotDate: string;
};

export type EmployerBrandItem = {
  source: string;
  ratingRaw: number;
  ratingScale: number;
  reviewCount: number;
  snapshotDate: string;
};

export type TrustFriction = {
  bbbRatingRaw: number;
  bbbRatingScale: number;
  complaintCount: number;
  complaintWindowMonths: number;
  snapshotDate: string;
};

export type MonthlyTrend = {
  month: string;
  residentExperience: number | null;
  employerBrand: number;
  trustFriction: number;
};

export type ReportValidation = {
  totalResidences: number;
  totalReviewSnapshots: number;
  operatingRegionCounts: Record<string, number>;
  unmappedCount: number;
  excludedNonResidenceSources: Record<string, number>;
  propertyDataSourceFile?: string | null;
  propertyRows?: number;
  propertyMatches?: number;
};

export type ReportData = {
  asOfDate: string;
  residences: Residence[];
  reviewSnapshots: ReviewSnapshot[];
  propertyData?: {
    sourceFile: string | null;
    year: number | null;
    rows: PropertyData[];
  };
  employerBrand: EmployerBrandItem[];
  trustFriction: TrustFriction;
  monthlyTrend: MonthlyTrend[];
  validation?: ReportValidation;
};

export type ConfidenceGrade = "A" | "B" | "C" | "D";

export type ResidenceScore = Residence & {
  experienceScore: number;
  googleOnly: number;
  delta: number;
  totalReviews: number;
  distinctSources: number;
  sources: string[];
  confidence: ConfidenceGrade;
};
