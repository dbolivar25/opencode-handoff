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
Your output will be used as the initial prompt in a fresh context window.

CRITICAL RULES:
- Output ONLY the handoff prompt content, nothing else
- Do NOT include any preamble like "Here's the handoff prompt:" 
- Do NOT wrap in code blocks or quotes
- Use @filepath syntax for file references (e.g., @src/auth/login.ts)
- Be concise - every token in the new session is precious
- Focus on CONCLUSIONS, not the journey to reach them
- Include only what's needed for the NEXT task`

  const typeSpecificInstructions = getTypeSpecificInstructions(handoffType)

  return `${baseInstructions}

${typeSpecificInstructions}`
}

function getTypeSpecificInstructions(handoffType: HandoffType): string {
  switch (handoffType) {
    case "impl":
      return `IMPLEMENTATION HANDOFF:
- Extract ONLY the finalized plan/design
- List files to be modified/created with @filepath syntax
- Do NOT include research tangents or abandoned approaches
- The new session should start executing immediately
- Format: Plan section, then files, then the goal`

    case "planning":
      return `PLANNING HANDOFF:
- Summarize key research findings and decisions
- Include what approaches were considered and why one was chosen
- List relevant files discovered during research
- The new session will create a detailed implementation plan
- Format: Findings section, key decisions, relevant files, then the goal`

    case "research":
      return `RESEARCH HANDOFF:
- Summarize conclusions and key learnings
- Note any dead ends so they're not repeated
- Include promising directions to explore
- Format: What we learned, what didn't work, next directions, then the goal`

    default:
      return `GENERAL HANDOFF:
- Summarize what was accomplished
- List key decisions made
- Include relevant files with @filepath syntax
- Note any pending items or blockers
- Format: Context section, files, then the goal`
  }
}

function buildAnalysisUserPrompt(goal: string, handoffType: HandoffType): string {
  const typeLabel = handoffType === "impl" 
    ? "implementation" 
    : handoffType === "planning" 
    ? "planning" 
    : handoffType === "research"
    ? "research continuation"
    : "continuation"

  return `Generate a handoff prompt for a new ${typeLabel} session.

The user's goal for the new session is:
"${goal}"

Analyze our conversation above and create a focused handoff prompt that:
1. Extracts only the relevant context needed for this specific goal
2. Uses @filepath syntax for any file references
3. Ends with the goal statement

Remember: Output ONLY the handoff prompt content. No explanations or meta-commentary.`
}

export function detectHandoffTypeFromGoal(goal: string): HandoffType {
  const lowerGoal = goal.toLowerCase()

  const implKeywords = [
    "execute",
    "implement",
    "build",
    "start",
    "begin",
    "phase",
    "step",
    "create the",
    "add the",
    "code",
  ]

  const planKeywords = [
    "plan",
    "design",
    "architect",
    "structure",
    "outline",
    "strategy",
    "approach",
    "proposal",
  ]

  const researchKeywords = [
    "research",
    "explore",
    "investigate",
    "find out",
    "search",
    "look into",
    "check",
    "analyze",
    "understand",
  ]

  if (implKeywords.some((k) => lowerGoal.includes(k))) {
    return "impl"
  }

  if (planKeywords.some((k) => lowerGoal.includes(k))) {
    return "planning"
  }

  if (researchKeywords.some((k) => lowerGoal.includes(k))) {
    return "research"
  }

  return "general"
}
