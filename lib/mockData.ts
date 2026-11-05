import { analyzeReport } from "./analysis";
import type { Report } from "./types";

const SEEDS: Pick<Report, "id" | "location" | "city" | "description" | "createdAt">[] = [
  {
    id: "AP-001",
    location: "Community Centre",
    city: "Waterloo",
    createdAt: "2026-11-03T15:00:00.000Z",
    description:
      "The wheelchair ramp outside the community centre is blocked by construction materials. People using wheelchairs are having to use the road to get around the building.",
  },
  {
    id: "AP-002",
    location: "University Main Entrance",
    city: "Waterloo",
    createdAt: "2026-11-02T15:00:00.000Z",
    description:
      "The pedestrian crossing near the university entrance does not provide audible signals. It is difficult for people with visual impairments to know when it is safe to cross.",
  },
  {
    id: "AP-003",
    location: "Public Library",
    city: "Toronto",
    createdAt: "2026-10-30T15:00:00.000Z",
    description:
      "The accessible entrance is difficult to locate because there are no clear signs pointing toward it.",
  },
  {
    id: "AP-004",
    location: "Transit Station",
    city: "Waterloo",
    createdAt: "2026-10-28T15:00:00.000Z",
    description:
      "The elevator has been out of service for two days, making it difficult for people who cannot use stairs to access the platform.",
  },
  {
    id: "AP-005",
    location: "Community Health Centre",
    city: "Toronto",
    createdAt: "2026-10-21T15:00:00.000Z",
    description:
      "The reception counter is very high and may be difficult to use from a wheelchair.",
  },
  {
    id: "AP-006",
    location: "Public Park",
    city: "Waterloo",
    createdAt: "2026-10-14T15:00:00.000Z",
    description:
      "A section of the main walking path has uneven pavement and several cracks.",
  },
];

export const SAMPLE_REPORTS: Report[] = SEEDS.map((seed) => {
  const analysis = analyzeReport(seed.description);
  return {
    ...seed,
    reportType: "Text",
    synthetic: true,
    reviewed: false,
    requiresFollowUp: analysis.requires_follow_up,
    analysisSource: "rule-based",
    analysis,
  };
});
