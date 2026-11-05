import { SAMPLE_REPORTS } from "./mockData";
import { CATEGORIES, PRIORITIES, type Analysis, type Report } from "./types";

export const REPORTS_STORAGE_KEY = "accesspulse.reports.v1";

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<Analysis>;
  return (
    typeof analysis.category === "string" &&
    (CATEGORIES as readonly string[]).includes(analysis.category) &&
    typeof analysis.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(analysis.priority) &&
    typeof analysis.summary === "string" &&
    Array.isArray(analysis.key_issues) &&
    analysis.key_issues.every((issue) => typeof issue === "string") &&
    typeof analysis.recommended_action === "string" &&
    typeof analysis.requires_follow_up === "boolean" &&
    typeof analysis.confidence === "number" &&
    Array.isArray(analysis.missing_information) &&
    analysis.missing_information.every((item) => typeof item === "string")
  );
}

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<Report>;
  return (
    typeof report.id === "string" &&
    typeof report.location === "string" &&
    typeof report.city === "string" &&
    (report.reportType === "Text" || report.reportType === "Voice Transcript") &&
    typeof report.description === "string" &&
    typeof report.createdAt === "string" &&
    typeof report.synthetic === "boolean" &&
    typeof report.reviewed === "boolean" &&
    typeof report.requiresFollowUp === "boolean" &&
    (report.analysisSource === "rule-based" || report.analysisSource === "openai") &&
    isAnalysis(report.analysis)
  );
}

const REPORTS_EVENT = "accesspulse-reports";

let snapshotRaw: string | null = null;
let snapshotReports: Report[] = SAMPLE_REPORTS;

function parseReports(raw: string): Report[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isReport)) return SAMPLE_REPORTS;
    return parsed;
  } catch {
    return SAMPLE_REPORTS;
  }
}

function readStoredRaw(): string | null {
  try {
    return window.localStorage.getItem(REPORTS_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (for example, in private browsing). Keep the
    // in-memory snapshot so the dashboard still works for this session.
    return snapshotRaw;
  }
}

export function subscribeToReports(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(REPORTS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REPORTS_EVENT, callback);
  };
}

export function getReportsSnapshot(): Report[] {
  const raw = readStoredRaw() ?? "";
  if (raw === snapshotRaw) return snapshotReports;
  snapshotRaw = raw;
  snapshotReports = raw ? parseReports(raw) : SAMPLE_REPORTS;
  return snapshotReports;
}

export function getServerReportsSnapshot(): Report[] {
  return SAMPLE_REPORTS;
}

export function ensureReportsSeeded(): void {
  try {
    if (window.localStorage.getItem(REPORTS_STORAGE_KEY)) return;
  } catch {
    return;
  }
  saveReports(SAMPLE_REPORTS);
}

export function saveReports(reports: Report[]): void {
  const raw = JSON.stringify(reports);
  snapshotRaw = raw;
  snapshotReports = reports;
  try {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, raw);
  } catch {
    // The app keeps working in memory when localStorage is blocked.
  }
  window.dispatchEvent(new Event(REPORTS_EVENT));
}

export function nextReportId(reports: Report[]): string {
  const max = reports.reduce((highest, report) => {
    const match = /^AP-(\d+)$/.exec(report.id);
    const value = match ? Number.parseInt(match[1], 10) : 0;
    return Math.max(highest, value);
  }, 0);

  return `AP-${String(max + 1).padStart(3, "0")}`;
}
