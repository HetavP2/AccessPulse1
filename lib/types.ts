export const CATEGORIES = [
  "Mobility",
  "Visual Accessibility",
  "Hearing Accessibility",
  "Infrastructure",
  "Signage and Navigation",
  "Other",
] as const;

export const PRIORITIES = ["High", "Medium", "Low"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ReportType = "Text" | "Voice Transcript";
export type AnalysisSource = "rule-based" | "openai";

export interface Analysis {
  category: Category;
  priority: Priority;
  summary: string;
  key_issues: string[];
  recommended_action: string;
  requires_follow_up: boolean;
  confidence: number;
  missing_information: string[];
}

export interface Report {
  id: string;
  location: string;
  city: string;
  reportType: ReportType;
  description: string;
  createdAt: string;
  synthetic: boolean;
  reviewed: boolean;
  requiresFollowUp: boolean;
  analysisSource: AnalysisSource;
  analysis: Analysis;
}

export interface AnalysisResponse extends Analysis {
  source: AnalysisSource;
}
