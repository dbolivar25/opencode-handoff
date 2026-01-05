import type { OpencodeClient } from "@opencode-ai/sdk"

export async function analyzeSessionForHandoff(
  client: OpencodeClient,
  sessionId: string,
  goal: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(goal)

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

function buildSystemPrompt(): string {
  return `You are generating a handoff prompt to start a new focused session.
Your output will be used DIRECTLY as the initial prompt in a fresh context window with NO prior history.

CRITICAL RULES:
1. Output ONLY the handoff content - no meta-commentary, no "Here's the handoff:"
2. Start with @filepath references - these load files into context first
3. The new session must be able to start work IMMEDIATELY from your output
4. Include only what's needed for the NEXT task - not what led to it

FORMAT STRUCTURE:

@filepath/relevant.ts
@filepath/another.ts
[ALL files the new session needs - to read, modify, or create]

The goal is to [clear statement of what this session will accomplish].

[Relevant context - adapt based on what the goal requires:]

For IMPLEMENTATION goals (executing a plan, building something):
- Include the plan/phase being executed
- Numbered tasks (high-level)
- Specific steps with exact file paths, function names, signatures
- Mention functions to reuse from existing files

For PLANNING goals (designing, architecting):
- Key findings that inform the design
- Constraints that must be respected
- Decisions that need to be made

For RESEARCH goals (investigating, exploring):
- Current understanding (facts only)
- Dead ends to avoid repeating
- Specific questions to answer next

For CONTINUATION goals (general next steps):
- Brief current state
- What needs to happen next

PRINCIPLES:
- Files are the primary context - list them thoroughly
- Be concrete: exact paths, function names, types, signatures
- No journey recap - only conclusions matter
- No rationale unless critical to the task
- Dense with actionable information
- The handoff should feel like picking up detailed notes from a colleague`
}

function buildUserPrompt(goal: string): string {
  return `Generate a handoff prompt for a new session.

USER'S GOAL: "${goal}"

Analyze our conversation and determine:
1. What kind of work will the new session do?
2. What context does it need to do that work immediately?
3. What files should be loaded?

Then generate the handoff following the format in your instructions.
Adapt the context section based on what the goal requires.
Output ONLY the handoff content.`
}
