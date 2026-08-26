export type PrepUnit = "minutes" | "hours" | "days";

export function normalizePrepMinutes(
  value: number | string,
  unit: PrepUnit = "minutes",
): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 45;

  const multiplier = unit === "days" ? 24 * 60 : unit === "hours" ? 60 : 1;
  const totalMinutes = amount * multiplier;
  return Math.min(30 * 24 * 60, Math.max(15, Math.round(totalMinutes)));
}

export function formatStudyDuration(totalMinutes: number): string {
  if (totalMinutes >= 24 * 60) {
    const days = totalMinutes / (24 * 60);
    return `${days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} day${days === 1 ? "" : "s"}`;
  }

  if (totalMinutes >= 60) {
    const hours = totalMinutes / 60;
    return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
  }

  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
}

export type StudyPhase = {
  name: string;
  minutes: number;
};

export function getStudyPhases(totalMinutes: number): StudyPhase[] {
  const warmup = Math.max(5, Math.min(12, Math.round(totalMinutes * 0.15)));
  const review = Math.max(10, Math.min(20, Math.round(totalMinutes * 0.2)));
  const core = Math.max(15, totalMinutes - warmup - review);

  return [
    { name: "Warm-up", minutes: warmup },
    { name: "Core study", minutes: core },
    { name: "Review", minutes: review },
  ];
}

export function buildStudyRoutine(
  topic: string,
  prepValue: number | string,
  goal = "Understand and remember the key information",
  unit: PrepUnit = "minutes",
): string {
  const totalMinutes = normalizePrepMinutes(prepValue, unit);
  const [warmup, core, review] = getStudyPhases(totalMinutes).map(
    (phase) => phase.minutes,
  );

  const focusLine = /exam|test|quiz/i.test(goal)
    ? "Prioritize the most likely exam themes and recall the key definitions quickly."
    : /beginner|learn|understand/i.test(goal)
      ? "Start with the foundation before moving to deeper ideas."
      : "Balance understanding, recall, and one practical example so the material becomes usable.";

  return `## Study routine

| Plan detail | Guidance |
| --- | --- |
| Topic | ${topic || "Your chosen subject"} |
| Available time | ${formatStudyDuration(totalMinutes)} |
| Focus | ${focusLine} |

### Phase plan

| Phase | Time | What to do |
| --- | ---: | --- |
| Warm-up | ${warmup} min | Scan the topic, note the heading structure, and list the 3 most important ideas. |
| Core study | ${core} min | Work through the main concept in focused chunks. Explain it aloud and connect the idea to an example or source. |
| Review | ${review} min | Summarize the topic in your own words, test recall quickly, and mark anything to revisit. |

**Quick rhythm:** Keep the last block focused on recall and checking gaps. Short review sessions usually stick better than passive reading.
`;
}
