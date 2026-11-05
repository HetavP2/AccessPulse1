interface StatsCardProps {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "high" | "follow";
}

const dotClass = {
  default: "bg-[#1f6f8b]",
  high: "bg-red-500",
  follow: "bg-amber-500",
};

export function StatsCard({ label, value, hint, tone = "default" }: StatsCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass[tone]}`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#10233f]">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}
