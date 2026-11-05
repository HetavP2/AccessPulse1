"use client";

import { useEffect, useState, type FormEvent } from "react";
import { analyzeReport } from "@/lib/analysis";
import type { AnalysisResponse, ReportType } from "@/lib/types";

interface ReportFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    location: string;
    city: string;
    reportType: ReportType;
    description: string;
    analysis: AnalysisResponse;
  }) => void;
}

const EMPTY = {
  location: "",
  city: "",
  reportType: "Text" as ReportType,
  description: "",
};

export function ReportForm({ open, onClose, onSubmit }: ReportFormProps) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!values.location.trim()) nextErrors.location = "Enter a location name.";
    if (!values.city.trim()) nextErrors.city = "Enter a city.";
    if (values.description.trim().length < 10) {
      nextErrors.description = "Enter at least 10 characters so the report can be analyzed.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    const started = Date.now();
    const description = values.description.trim();

    try {
      let analysis: AnalysisResponse | null = null;
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        if (!response.ok) throw new Error("Analysis request failed");
        analysis = (await response.json()) as AnalysisResponse;
      } catch {
        analysis = { ...analyzeReport(description), source: "rule-based" };
      }

      const elapsed = Date.now() - started;
      if (elapsed < 700) {
        await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
      }

      onSubmit({
        location: values.location.trim(),
        city: values.city.trim(),
        reportType: values.reportType,
        description,
        analysis,
      });
      setValues(EMPTY);
      setErrors({});
    } catch {
      setFormError("The report could not be analyzed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#10233f]/40 p-4 sm:items-center"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-report-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="submit-report-title" className="text-xl font-semibold text-[#10233f]">
              Submit report
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Paste a written report or a voice transcript. This prototype does not record audio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-[#10233f]">
            Location name
            <input
              value={values.location}
              onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
              autoFocus
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
              placeholder="Community Centre"
            />
            {errors.location ? <span className="mt-1 block text-xs text-red-700">{errors.location}</span> : null}
          </label>

          <label className="block text-sm font-medium text-[#10233f]">
            City
            <input
              value={values.city}
              onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
              placeholder="Waterloo"
            />
            {errors.city ? <span className="mt-1 block text-xs text-red-700">{errors.city}</span> : null}
          </label>

          <label className="block text-sm font-medium text-[#10233f]">
            Report type
            <select
              value={values.reportType}
              onChange={(event) =>
                setValues((current) => ({ ...current, reportType: event.target.value as ReportType }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
            >
              <option value="Text">Text</option>
              <option value="Voice Transcript">Voice Transcript</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-[#10233f]">
            Report description
            <textarea
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={6}
              maxLength={4000}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
              placeholder="Describe the accessibility barrier."
            />
            {errors.description ? (
              <span className="mt-1 block text-xs text-red-700">{errors.description}</span>
            ) : null}
          </label>

          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Analysis runs locally unless an OpenAI key is configured on the server.</p>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#0f3d6e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c325a] disabled:opacity-70"
            >
              {loading ? "Analyzing report..." : "Analyze and save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
