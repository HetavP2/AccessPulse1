"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ReportDetail } from "@/components/ReportDetail";
import { ReportForm } from "@/components/ReportForm";
import { StatsCard } from "@/components/StatsCard";
import { analysisSourceLabel } from "@/lib/analysis";
import { getCommunityInsights, getDashboardStats, recentReports } from "@/lib/stats";
import {
  ensureReportsSeeded,
  getReportsSnapshot,
  getServerReportsSnapshot,
  nextReportId,
  saveReports,
  subscribeToReports,
} from "@/lib/storage";
import type { AnalysisResponse, Priority, Report, ReportType } from "@/lib/types";

type View = "overview" | "reports";

const priorityClass: Record<Priority, string> = {
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-800",
  Low: "bg-emerald-50 text-emerald-700",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function Dashboard() {
  const reports = useSyncExternalStore(subscribeToReports, getReportsSnapshot, getServerReportsSnapshot);
  const [view, setView] = useState<View>("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"rule-based" | "openai">("rule-based");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");

  useEffect(() => {
    ensureReportsSeeded();
    fetch("/api/analyze")
      .then((response) => response.json())
      .then((data: { mode?: string }) => {
        if (data.mode === "openai") setAnalysisMode("openai");
      })
      .catch(() => setAnalysisMode("rule-based"));
  }, []);

  function updateReports(next: Report[]) {
    saveReports(next);
  }

  function handleCreate(input: {
    location: string;
    city: string;
    reportType: ReportType;
    description: string;
    analysis: AnalysisResponse;
  }) {
    const report: Report = {
      id: nextReportId(reports),
      location: input.location,
      city: input.city,
      reportType: input.reportType,
      description: input.description,
      createdAt: new Date().toISOString(),
      synthetic: false,
      reviewed: false,
      requiresFollowUp: input.analysis.requires_follow_up,
      analysisSource: input.analysis.source,
      analysis: input.analysis,
    };
    updateReports([report, ...reports]);
    setFormOpen(false);
    setSelectedId(report.id);
    setView("overview");
  }

  function markReviewed(id: string) {
    updateReports(reports.map((report) => (report.id === id ? { ...report, reviewed: true } : report)));
  }

  function toggleFollowUp(id: string) {
    updateReports(
      reports.map((report) =>
        report.id === id ? { ...report, requiresFollowUp: !report.requiresFollowUp } : report,
      ),
    );
  }

  const stats = useMemo(() => getDashboardStats(reports), [reports]);
  const insights = useMemo(() => getCommunityInsights(reports), [reports]);
  const latest = useMemo(() => recentReports(reports, 5), [reports]);
  const selected = reports.find((report) => report.id === selectedId) ?? null;
  const visibleReports = [...reports]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((report) => priorityFilter === "All" || report.analysis.priority === priorityFilter);
  const maxCategory = insights.categories[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-[#10233f]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="px-5 py-6">
            <p className="text-lg font-semibold">AccessPulse</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Turning community feedback into actionable accessibility insights.
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
            <NavButton active={view === "overview"} onClick={() => setView("overview")}>
              Overview
            </NavButton>
            <NavButton active={view === "reports"} onClick={() => setView("reports")}>
              Reports
            </NavButton>
          </nav>
          <div className="mt-auto px-5 py-5">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="w-full rounded-xl bg-[#0f3d6e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c325a]"
            >
              Submit Report
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 md:hidden">AccessPulse</p>
                <h1 className="text-xl font-semibold">{view === "overview" ? "Overview" : "Reports"}</h1>
                <p className="text-sm text-slate-500">
                  Turning community feedback into actionable accessibility insights.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="rounded-xl bg-[#0f3d6e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c325a]"
              >
                Submit Report
              </button>
            </div>
            <nav className="mt-4 flex gap-2 md:hidden" aria-label="Primary">
              <NavButton active={view === "overview"} onClick={() => setView("overview")}>
                Overview
              </NavButton>
              <NavButton active={view === "reports"} onClick={() => setView("reports")}>
                Reports
              </NavButton>
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">
            <p className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              {analysisMode === "openai"
                ? "An OpenAI API key is configured. New reports are sent for AI analysis when the request succeeds; otherwise the app falls back to rule-based demo analysis. Sample reports keep their precomputed rule-based analysis."
                : "New reports use rule-based demo analysis. Keyword rules classify the text."}
            </p>

            {view === "overview" ? (
              <div className="space-y-6">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatsCard label="Total reports" value={stats.total} hint="Stored in this browser" />
                  <StatsCard
                    label="High-priority reports"
                    value={stats.highPriority}
                    hint="Blocked, dangerous, or out of service"
                    tone="high"
                  />
                  <StatsCard label="Locations covered" value={stats.locations} hint="Unique location and city pairs" />
                  <StatsCard
                    label="Reports requiring follow-up"
                    value={stats.followUp}
                    hint="Current follow-up flag"
                    tone="follow"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">Community Insights</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insights.summary}</p>
                  <div className="mt-5 grid gap-6 lg:grid-cols-3">
                    <div>
                      <h3 className="text-sm font-semibold">Most frequently reported categories</h3>
                      {insights.categories.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">No categories yet.</p>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {insights.categories.map((item) => (
                            <li key={item.category}>
                              <div className="flex items-center justify-between text-sm">
                                <span>{item.category}</span>
                                <span className="font-semibold">{item.count}</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-[#1f6f8b]"
                                  style={{ width: `${Math.max(8, (item.count / maxCategory) * 100)}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Locations with multiple reports</h3>
                      {insights.multiLocations.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">No location has more than one report yet.</p>
                      ) : (
                        <ul className="mt-3 space-y-2 text-sm">
                          {insights.multiLocations.map((location) => (
                            <li
                              key={location.label}
                              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                            >
                              <span>{location.label}</span>
                              <span className="font-semibold">{location.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">High-priority reports</h3>
                      <p className="mt-3 text-3xl font-semibold">{insights.highPriority}</p>
                      {insights.highPriority === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">No high-priority reports right now.</p>
                      ) : (
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          {reports
                            .filter((report) => report.analysis.priority === "High")
                            .map((report) => (
                              <li key={report.id}>
                                {report.location}, {report.city}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-semibold">Five most recent reports</h2>
                  <div className="mt-3 space-y-3">
                    {latest.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                        No reports yet. Use Submit Report to add the first observation.
                      </p>
                    ) : (
                      latest.map((report) => (
                        <ReportRow key={report.id} report={report} onOpen={() => setSelectedId(report.id)} />
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{visibleReports.length} shown</p>
                  <label className="text-sm text-slate-600">
                    Priority
                    <select
                      value={priorityFilter}
                      onChange={(event) => setPriorityFilter(event.target.value as "All" | Priority)}
                      className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="All">All</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>
                </div>
                <div className="space-y-3">
                  {visibleReports.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                      No reports match this filter.
                    </p>
                  ) : (
                    visibleReports.map((report) => (
                      <ReportRow key={report.id} report={report} onOpen={() => setSelectedId(report.id)} />
                    ))
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <ReportForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
      <ReportDetail report={selected} onClose={() => setSelectedId(null)} onMarkReviewed={markReviewed} onToggleFollowUp={toggleFollowUp} />
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-xl px-3 py-2 text-left text-sm font-medium ${
        active ? "bg-[#e7eef6] text-[#0f3d6e]" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ReportRow({ report, onOpen }: { report: Report; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#1f4e79]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">{report.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[report.analysis.priority]}`}>
          {report.analysis.priority}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-[#16365c]">
          {report.analysis.category}
        </span>
        {report.reviewed ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Reviewed</span>
        ) : null}
        {report.synthetic ? <span className="text-xs text-slate-400">Synthetic demo data</span> : null}
      </div>
      <p className="mt-2 font-semibold">
        {report.location}, {report.city}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{report.analysis.summary}</p>
      <p className="mt-2 text-xs text-slate-400">
        {formatDate(report.createdAt)} · {analysisSourceLabel(report.analysisSource)}
        {report.requiresFollowUp ? " · Follow-up required" : ""}
      </p>
    </button>
  );
}
