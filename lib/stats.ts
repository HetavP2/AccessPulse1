import type { Category, Report } from "./types";
import { CATEGORIES } from "./types";

export interface CategoryCount {
  category: Category;
  count: number;
}

export interface LocationCount {
  label: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  highPriority: number;
  locations: number;
  followUp: number;
}

export interface CommunityInsights {
  categories: CategoryCount[];
  mostFrequent: CategoryCount[];
  multiLocations: LocationCount[];
  highPriority: number;
  summary: string;
}

function locationKey(report: Report): string {
  return `${report.location.trim().toLowerCase()}|${report.city.trim().toLowerCase()}`;
}

export function getDashboardStats(reports: Report[]): DashboardStats {
  return {
    total: reports.length,
    highPriority: reports.filter((report) => report.analysis.priority === "High").length,
    locations: new Set(reports.map(locationKey)).size,
    followUp: reports.filter((report) => report.requiresFollowUp).length,
  };
}

export function getCommunityInsights(reports: Report[]): CommunityInsights {
  const counts = new Map<Category, number>(CATEGORIES.map((category) => [category, 0]));
  for (const report of reports) {
    counts.set(report.analysis.category, (counts.get(report.analysis.category) ?? 0) + 1);
  }

  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const topCount = categories[0]?.count ?? 0;
  const mostFrequent = categories.filter((item) => item.count === topCount && topCount > 0);

  const locationCounts = new Map<string, { label: string; count: number }>();
  for (const report of reports) {
    const key = locationKey(report);
    const current = locationCounts.get(key);
    if (current) {
      current.count += 1;
    } else {
      locationCounts.set(key, {
        label: `${report.location}, ${report.city}`,
        count: 1,
      });
    }
  }

  const multiLocations = [...locationCounts.values()]
    .filter((location) => location.count > 1)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const highPriority = reports.filter((report) => report.analysis.priority === "High").length;
  const followUp = reports.filter((report) => report.requiresFollowUp).length;
  const frequentLabel =
    mostFrequent.length === 0
      ? ""
      : mostFrequent.length === 1
        ? `${mostFrequent[0].category} (${mostFrequent[0].count})`
        : mostFrequent.map((item) => `${item.category} (${item.count})`).join(" and ");

  const summary =
    reports.length === 0
      ? "No reports yet. Submit a community observation to start building insights."
      : `This browser has ${reports.length} report${reports.length === 1 ? "" : "s"}. ${highPriority} ${highPriority === 1 ? "is" : "are"} high priority and ${followUp} ${followUp === 1 ? "requires" : "require"} follow-up. ${frequentLabel ? `The most frequently reported ${mostFrequent.length === 1 ? "category is" : "categories are"} ${frequentLabel}.` : ""}`;

  return { categories, mostFrequent, multiLocations, highPriority, summary };
}

export function recentReports(reports: Report[], limit = 5): Report[] {
  return [...reports]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
