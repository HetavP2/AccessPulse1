import type { Analysis, AnalysisSource, Category, Priority } from "./types";

const CATEGORY_RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "Mobility",
    keywords: ["wheelchair", "ramp", "elevator", "stairs", "wheelchair access"],
  },
  {
    category: "Visual Accessibility",
    keywords: ["blind", "visual", "crossing signal", "audible signal"],
  },
  {
    category: "Hearing Accessibility",
    keywords: [
      "hearing",
      "captions",
      "caption",
      "sign language",
      "audio announcement",
    ],
  },
  {
    category: "Infrastructure",
    keywords: [
      "pavement",
      "sidewalk",
      "pathway",
      "construction",
      "damaged",
      "crack",
      "uneven",
    ],
  },
  {
    category: "Signage and Navigation",
    keywords: ["signage", "signs", "sign", "directions", "entrance", "wayfinding"],
  },
];

const HIGH_PRIORITY = [
  "blocked",
  "inaccessible",
  "out of service",
  "emergency",
  "dangerous",
  "cannot access",
  "can't access",
];

const MEDIUM_PRIORITY = [
  "difficult",
  "damaged",
  "missing",
  "broken",
  "problem",
  "uneven",
  "crack",
];

const LOW_PRIORITY = ["suggestion", "improvement", "could", "would be helpful"];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countKeyword(text: string, keyword: string): number {
  const parts = keyword.trim().split(/\s+/).map(escapeRegex);
  const pattern = parts
    .map((part, index) => (index === parts.length - 1 ? `${part}s?` : part))
    .join("\\s+");
  return text.match(new RegExp(`\\b${pattern}\\b`, "gi"))?.length ?? 0;
}

function hasPhrase(text: string, phrase: string): boolean {
  return countKeyword(text, phrase) > 0;
}

function bestSentence(description: string, keywords: string[]): string {
  const sentences = description
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return "The report did not include a description.";
  }

  let best = sentences[0];
  let bestScore = -1;

  for (const sentence of sentences) {
    const score = keywords.reduce(
      (total, keyword) => total + countKeyword(sentence, keyword) * keyword.length,
      0,
    );
    if (score > bestScore) {
      best = sentence;
      bestScore = score;
    }
  }

  if (best.length > 220) {
    return `${best.slice(0, 217).trimEnd()}...`;
  }

  return best;
}

function extractKeyIssues(text: string, category: Category): string[] {
  const issues: string[] = [];

  if (hasPhrase(text, "counter") && /high|tall/i.test(text) && hasPhrase(text, "wheelchair")) {
    issues.push("Reception counter is difficult to use from a wheelchair");
  } else if (hasPhrase(text, "ramp") && /block|obstruct/i.test(text)) {
    issues.push("Wheelchair ramp is blocked");
  } else if (hasPhrase(text, "wheelchair") && hasPhrase(text, "ramp")) {
    issues.push("Wheelchair ramp access");
  } else if (hasPhrase(text, "wheelchair")) {
    issues.push("Barrier affecting wheelchair users");
  }

  if (
    hasPhrase(text, "elevator") &&
    /out of service|broken|damaged|not working|unavailable/i.test(text)
  ) {
    issues.push(
      hasPhrase(text, "out of service")
        ? "Elevator is out of service"
        : "Elevator is broken or unavailable",
    );
  } else if (hasPhrase(text, "elevator")) {
    issues.push("Elevator access concern");
  }

  if (hasPhrase(text, "stairs") && /cannot|can't|unable|difficult/i.test(text)) {
    issues.push("Stairs are a barrier for people who cannot use them");
  }

  if (hasPhrase(text, "audible signal") && /does not|doesn't|do not|no |without|not provide/i.test(text)) {
    issues.push("Crossing does not provide audible signals");
  } else if (hasPhrase(text, "blind") || hasPhrase(text, "visual")) {
    issues.push("Barrier for people with visual impairments");
  }

  if (hasPhrase(text, "hearing loop") && /broken|not working|out of service|faulty/i.test(text)) {
    issues.push("Hearing loop is broken or unavailable");
  }

  if (
    hasPhrase(text, "hearing") ||
    hasPhrase(text, "caption") ||
    hasPhrase(text, "sign language") ||
    hasPhrase(text, "audio announcement")
  ) {
    issues.push("Barrier for people who are deaf or hard of hearing");
  }

  if (
    (hasPhrase(text, "pavement") || hasPhrase(text, "sidewalk") || hasPhrase(text, "pathway") || /\bpath\b/i.test(text)) &&
    (hasPhrase(text, "uneven") || hasPhrase(text, "crack") || hasPhrase(text, "damaged") || hasPhrase(text, "broken"))
  ) {
    issues.push("Walking surface is uneven or damaged");
  } else if (hasPhrase(text, "construction")) {
    issues.push("Construction is affecting access");
  }

  if (
    (hasPhrase(text, "sign") || hasPhrase(text, "signage")) &&
    /no |not |without|missing|difficult to locate/i.test(text)
  ) {
    issues.push("Accessible route is poorly signed");
  } else if (hasPhrase(text, "entrance") && /difficult to locate|hard to find|cannot find/i.test(text)) {
    issues.push("Accessible entrance is hard to locate");
  }

  if (issues.length === 0) {
    issues.push(
      category === "Other"
        ? "Report does not match a known accessibility category"
        : `${category} concern reported`,
    );
  }

  return [...new Set(issues)].slice(0, 4);
}

function recommendedAction(text: string, category: Category, priority: Priority): string {
  if (priority === "High" && hasPhrase(text, "ramp") && /block|obstruct/i.test(text)) {
    return "Contact the facility manager and arrange an accessible alternative entrance.";
  }

  if (
    priority === "High" &&
    hasPhrase(text, "elevator") &&
    /out of service|broken|damaged|not working|unavailable/i.test(text)
  ) {
    return "Contact the facility and request an accessible alternative while the elevator is unavailable.";
  }

  if (hasPhrase(text, "hearing loop") && /broken|not working|out of service|faulty/i.test(text)) {
    return "Report the broken hearing loop to the facility and ask for it to be repaired or for a staffed alternative.";
  }

  if (category === "Visual Accessibility") {
    return "Ask the site owner to review the crossing and add audible signals if they are missing.";
  }

  if (category === "Hearing Accessibility") {
    return "Ask the facility to provide captions, sign language, or another visual alternative for spoken information.";
  }

  if (category === "Signage and Navigation") {
    return "Request clearer signs that direct people to the accessible entrance or route.";
  }

  if (category === "Infrastructure") {
    return "Report the surface condition to the site owner and request repair of the walking path.";
  }

  if (category === "Mobility") {
    return "Contact the facility to confirm wheelchair access and identify a usable route.";
  }

  return "Review the report with the location and confirm what access change is needed.";
}

function missingInformation(text: string, category: Category): string[] {
  const missing: string[] = [];

  if (
    !/alternative|another entrance|other entrance|detour/i.test(text) &&
    (category === "Mobility" || category === "Infrastructure" || category === "Signage and Navigation")
  ) {
    missing.push("Whether an alternative accessible entrance or route is available");
  }

  if (!/\b(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|since)\b|\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:hour|day|week|month|year)s?\b/i.test(text)) {
    missing.push("When the issue was first observed");
  }

  if (missing.length === 0) {
    missing.push("Who at the facility can confirm the current condition");
  }

  return missing.slice(0, 3);
}

export function analyzeReport(description: string): Analysis {
  const text = description.trim().replace(/\s+/g, " ").slice(0, 4000);

  const scored = CATEGORY_RULES.map((rule) => ({
    category: rule.category,
    score: rule.keywords.reduce((total, keyword) => total + countKeyword(text, keyword), 0),
    keywords: rule.keywords.filter((keyword) => countKeyword(text, keyword) > 0),
  })).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const category: Category = best && best.score > 0 ? best.category : "Other";
  const matchedKeywords = best && best.score > 0 ? best.keywords : [];

  let priority: Priority = "Low";
  let priorityMatched = false;
  if (HIGH_PRIORITY.some((keyword) => hasPhrase(text, keyword))) {
    priority = "High";
    priorityMatched = true;
  } else if (MEDIUM_PRIORITY.some((keyword) => hasPhrase(text, keyword))) {
    priority = "Medium";
    priorityMatched = true;
  } else if (LOW_PRIORITY.some((keyword) => hasPhrase(text, keyword))) {
    priority = "Low";
    priorityMatched = true;
  }

  const keyIssues = text ? extractKeyIssues(text, category) : ["No description was provided"];
  const specificIssue = keyIssues.some((issue) => !issue.endsWith("concern reported") && !issue.startsWith("Report does not"));

  let confidence = 0.35;
  if (category !== "Other") confidence += 0.3;
  if ((best?.score ?? 0) >= 2) confidence += 0.1;
  if ((best?.score ?? 0) >= 3) confidence += 0.05;
  if (priorityMatched) confidence += 0.1;
  if (specificIssue) confidence += 0.1;
  confidence = Math.min(0.85, Math.round(confidence * 100) / 100);

  return {
    category,
    priority,
    summary: text ? bestSentence(text, matchedKeywords) : "No description was provided.",
    key_issues: keyIssues,
    recommended_action: text
      ? recommendedAction(text, category, priority)
      : "Ask the reporter for a description before taking action.",
    requires_follow_up: priority !== "Low",
    confidence,
    missing_information: text ? missingInformation(text, category) : ["A description of the barrier"],
  };
}

export function analysisSourceLabel(source: AnalysisSource): string {
  return source === "openai" ? "AI analysis (OpenAI)" : "Rule-based demo analysis";
}
