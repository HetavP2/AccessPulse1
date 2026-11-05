"use client";

import { useEffect } from "react";
import { analysisSourceLabel } from "@/lib/analysis";
import type { Priority, Report } from "@/lib/types";

interface ReportDetailProps {
  report: Report | null;
  onClose: () => void;
  onMarkReviewed: (id: string) => void;
  onToggleFollowUp: (id: string) => void;
}

const priorityClass: Record<Priority, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-800 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ReportDetail({ report, onClose, onMarkReviewed, onToggleFollowUp }: ReportDetailProps) {
  useEffect(() => {
    if (!report) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [report, onClose]);

  if (!report) return null;

  const sourceLabel = analysisSourceLabel(report.analysisSource);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#10233f]/40 p-4 sm:items-center"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{report.id}</p>
            <h2 id="report-detail-title" className="mt-1 text-xl font-semibold text-[#10233f]">
              {report.location}
            </h2>
            <p className="text-sm text-slate-500">
              {report.city} · {formatDate(report.createdAt)} · {report.reportType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#16365c]">
            {report.analysis.category}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass[report.analysis.priority]}`}>
            {report.analysis.priority} priority
          </span>
          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
            {sourceLabel}
          </span>
          {report.synthetic ? (
            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500">
              Synthetic demo data
            </span>
          ) : null}
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <h3 className="text-sm font-semibold text-[#10233f]">Original report</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{report.description}</p>
        </section>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</dt>
            <dd className="mt-1 text-sm leading-6 text-[#10233f]">{report.analysis.summary}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended action</dt>
            <dd className="mt-1 text-sm leading-6 text-[#10233f]">{report.analysis.recommended_action}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key issues</dt>
            <dd className="mt-1 text-sm text-[#10233f]">
              <ul className="list-disc space-y-1 pl-4">
                {report.analysis.key_issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing information</dt>
            <dd className="mt-1 text-sm text-[#10233f]">
              <ul className="list-disc space-y-1 pl-4">
                {report.analysis.missing_information.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
            <p className="mt-1 text-sm text-[#10233f]">{Math.round(report.analysis.confidence * 100)}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Human review</p>
            <p className={`mt-1 text-sm font-medium ${report.reviewed ? "text-emerald-700" : "text-amber-800"}`}>
              {report.reviewed ? "Reviewed" : "Needs review"}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {report.analysisSource === "openai"
            ? "AI analysis using the OpenAI API. A person should confirm this result before the organization acts on it."
            : "Rule-based demo analysis. Keyword matching produced this result. It is not an AI model."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onMarkReviewed(report.id)}
            disabled={report.reviewed}
            className="rounded-xl bg-[#0f3d6e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c325a] disabled:cursor-default disabled:bg-emerald-700"
          >
            {report.reviewed ? "Reviewed" : "Mark as Reviewed"}
          </button>
          <button
            type="button"
            onClick={() => onToggleFollowUp(report.id)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#10233f] hover:bg-slate-50"
          >
            {report.requiresFollowUp ? "Follow-up required: Yes" : "Follow-up required: No"}
          </button>
        </div>
      </div>
    </div>
  );
}
