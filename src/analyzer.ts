import type { OpencodeClient } from "@opencode-ai/sdk"
import type { HandoffType } from "./types.ts"

export async function analyzeSessionForHandoff(
  client: OpencodeClient,
  sessionId: string,
  goal: string,
  handoffType: HandoffType
): Promise<string> {
  const systemPrompt = buildAnalysisSystemPrompt(handoffType)
  const userPrompt = buildAnalysisUserPrompt(goal, handoffType)

  const response = await client.session.prompt({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: userPrompt }],
      system: systemPrompt,
    },
  })

  if (!response.data) {
    throw new Error("Failed to get handoff analysis from LLM")
  }

  const textParts = response.data.parts.filter((p) => p.type === "text")
  const handoffContent = textParts
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("\n")

  return handoffContent.trim()
}

function buildAnalysisSystemPrompt(handoffType: HandoffType): string {
  const baseInstructions = `You are generating a handoff prompt to start a new focused session.
Your output will be used DIRECTLY as the initial prompt in a fresh context window.

CRITICAL RULES:
- Output ONLY the handoff content - no wrapping, no meta-commentary
- NO preamble like "Here's the handoff:" or "Based on our discussion:"
- Start with @filepath references - these load into context first
- Be specific and actionable - the new session should start work immediately
- NO journey recap - only conclusions and next steps matter`

  const typeSpecificInstructions = getTypeSpecificInstructions(handoffType)

  return `${baseInstructions}

${typeSpecificInstructions}`
}

function getTypeSpecificInstructions(handoffType: HandoffType): string {
  switch (handoffType) {
    case "impl":
      return `IMPLEMENTATION HANDOFF - For executing a plan

FORMAT (follow exactly):

@filepath/one.ts
@filepath/two.ts
@filepath/three.ts
[list ALL relevant files first, one per line]

The goal is to [execute/implement specific phase or task].

[Phase/Section name] (Estimated: X hours)

Tasks:
1. [High-level task from plan]
2. [High-level task from plan]
3. [Continue numbering...]

Specific steps:
1. [Concrete step with exact file path]. [Details about what to do, function names, signatures].
2. [Next concrete step]. [Mention specific functions to reuse: functionName from @filepath].
3. [Continue with implementation-ready instructions...]

REQUIREMENTS:
- Include ALL files needed: files to read, modify, AND create
- Tasks are high-level overview items from the plan
- Specific steps have exact file paths, function names, signatures, types
- Mention existing functions to reuse with their file locations
- Be concrete enough that coding can start on step 1 immediately
- NO research findings, NO decision rationale, NO alternative approaches`

    case "planning":
      return `PLANNING HANDOFF - For creating an implementation plan after research

FORMAT (follow exactly):

@filepath/discovered.ts
@filepath/relevant.ts
@filepath/patterns.ts
[list files discovered during research]

The goal is to create a detailed implementation plan for [specific feature/system].

Key findings:
- [Concrete finding about how current code works]
- [Pattern or structure discovered in @filepath]
- [Technical constraint or requirement found]

Constraints:
- [Hard constraint that must be respected]
- [Compatibility requirement]
- [Performance or security requirement]

Required decisions for the plan:
1. [Specific design decision needed]
2. [Architecture choice to make]
3. [Trade-off to resolve]

REQUIREMENTS:
- Findings should be concrete facts, not opinions
- Reference specific files where patterns were found
- Constraints are non-negotiable requirements
- Decisions list what the plan must address
- NO implementation details - that's for the impl handoff
- NO journey recap - only what informs the plan`

    case "research":
      return `RESEARCH HANDOFF - For continuing investigation in fresh context

FORMAT (follow exactly):

@filepath/explored.ts
@filepath/checked.ts
[list files already examined]

The goal is to [investigate/explore/understand specific question].

Current understanding:
- [Concrete fact established]
- [How something works, referencing @filepath]
- [Connection or pattern discovered]

Dead ends (don't repeat these):
- [Approach tried that failed and why briefly]
- [Path that looked promising but didn't work]

Investigate next:
- [Specific question to answer]
- [Specific file or area to examine: check @filepath for X]
- [Hypothesis to test]

REQUIREMENTS:
- Dead ends section prevents wasting time on failed approaches
- "Investigate next" has specific, actionable items
- Current understanding is facts only, not speculation
- Keep it focused - this is a research continuation, not a report`

    default:
      return `GENERAL HANDOFF - For continuing work in fresh context

FORMAT (follow exactly):

@filepath/relevant.ts
@filepath/related.ts
[list relevant files]

Current state:
- [What exists now]
- [What was accomplished]

The goal is to [specific next task].

REQUIREMENTS:
- Keep current state brief - just enough to orient
- Goal should be clear and actionable
- Files should be the main context, not prose`
  }
}

function buildAnalysisUserPrompt(goal: string, handoffType: HandoffType): string {
  const typeLabel =
    handoffType === "impl"
      ? "implementation"
      : handoffType === "planning"
        ? "planning"
        : handoffType === "research"
          ? "research continuation"
          : "continuation"

  return `Generate a handoff prompt for a new ${typeLabel} session.

USER'S GOAL: "${goal}"

Analyze our conversation and extract what's needed for this handoff.
Follow the format in your instructions exactly.
Output ONLY the handoff content - no explanations or meta-commentary.`
}

export function detectHandoffTypeFromGoal(goal: string): HandoffType {
  const lowerGoal = goal.toLowerCase()

  const implPatterns = [
    /execut/,
    /implement\s+(phase|step|the|this)/,
    /build\s+(phase|step|the|this)/,
    /start\s+(phase|step|building|implementing|coding)/,
    /begin\s+(phase|step|building|implementing|coding)/,
    /phase\s*\d/,
    /step\s*\d/,
    /code\s+(phase|step|the|this)/,
    /write\s+(the|this)\s+\w+\s*(function|class|component|module)/,
    /do\s+phase/,
  ]

  const planPatterns = [
    /create\s+(a\s+)?(detailed\s+)?(implementation\s+)?plan/,
    /design\s+(the|a|an)/,
    /architect/,
    /plan\s+(for|out|the|how)/,
    /outline\s+(the|a|an)/,
    /strategy\s+for/,
    /spec\s+out/,
    /draft\s+(a\s+)?(design|plan|spec)/,
  ]

  const researchPatterns = [
    /research/,
    /explore\s+(how|what|the|if)/,
    /investigat/,
    /find\s+(out|how|what|where|why)/,
    /look\s+(into|at)\s+(how|what|the)/,
    /check\s+(how|if|whether|what)/,
    /understand\s+(how|what|the)/,
    /figure\s+out/,
    /dig\s+into/,
    /learn\s+(about|how)/,
  ]

  if (implPatterns.some((p) => p.test(lowerGoal))) {
    return "impl"
  }

  if (planPatterns.some((p) => p.test(lowerGoal))) {
    return "planning"
  }

  if (researchPatterns.some((p) => p.test(lowerGoal))) {
    return "research"
  }

  return "general"
}
