import { MissionPlan, MissionSlice, MissionSourceIssue, ValidationAssertion } from "./schemas.js";

export interface PlannerInput {
  goal: string;
  issue?: MissionSourceIssue;
}

export interface PlannerOutput {
  plan: MissionPlan;
  validationContract: ValidationAssertion[];
}

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractTaskLines(text: string): string[] {
  const lines = normalizeLines(text);
  const bulletLines = lines
    .map((line) => line.match(/^[-*]\s+(.*)$/)?.[1] ?? line.match(/^\d+\.\s+(.*)$/)?.[1])
    .filter((line): line is string => Boolean(line));
  if (bulletLines.length > 0) return bulletLines.slice(0, 5);

  return text
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
    .slice(0, 3);
}

function createDefaultSlices(goal: string): MissionSlice[] {
  return [
    {
      id: "slice-1-plan",
      title: `Clarify implementation scope for ${goal}`,
      kind: "plan",
      status: "planned",
    },
    {
      id: "slice-2-implement",
      title: `Implement core work for ${goal}`,
      kind: "implement",
      status: "planned",
      dependsOn: ["slice-1-plan"],
    },
    {
      id: "slice-3-validate",
      title: `Validate and record results for ${goal}`,
      kind: "validate",
      status: "planned",
      dependsOn: ["slice-2-implement"],
    },
  ];
}

function createValidationAssertions(
  goal: string,
  issue?: MissionSourceIssue,
): ValidationAssertion[] {
  const sourceText = issue ? `${issue.title}\n${issue.body ?? ""}` : goal;
  const explicitAssertions = normalizeLines(sourceText)
    .filter((line) => /should|must|acceptance|criteria|verify|validation/i.test(line))
    .slice(0, 4)
    .map((line, index) => ({
      id: `vc-${index + 1}`,
      title: line.slice(0, 80),
      type: /ui|page|render|click|browser/i.test(line)
        ? ("behavioral" as const)
        : ("scrutiny" as const),
      description: line,
    }));

  if (explicitAssertions.length > 0) return explicitAssertions;

  return [
    {
      id: "vc-1",
      title: "mission-state-persists",
      type: "scrutiny",
      description: "The mission state must persist the plan, findings, and handoffs for this task.",
    },
    {
      id: "vc-2",
      title: "primary-request-is-validated",
      type: "behavioral",
      description: `The primary requested outcome for \"${goal}\" must be validated independently of implementation decisions.`,
    },
  ];
}

export function createMissionPlan(input: PlannerInput): PlannerOutput {
  const sourceText = input.issue ? `${input.issue.title}\n${input.issue.body ?? ""}` : input.goal;
  const tasks = extractTaskLines(sourceText);

  const slices =
    tasks.length >= 2
      ? tasks.map((task, index) => ({
          id: `slice-${index + 1}`,
          title: task,
          kind: index === tasks.length - 1 ? ("validate" as const) : ("implement" as const),
          status: "planned" as const,
          dependsOn: index > 0 ? [`slice-${index}`] : undefined,
        }))
      : createDefaultSlices(input.goal);

  return {
    plan: {
      summary: input.issue
        ? `Plan derived from GitHub issue #${input.issue.number}: ${input.issue.title}`
        : `Plan derived from goal: ${input.goal}`,
      slices,
    },
    validationContract: createValidationAssertions(input.goal, input.issue),
  };
}
