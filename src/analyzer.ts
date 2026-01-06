import type { OpencodeClient } from "@opencode-ai/sdk"

export async function analyzeSessionForHandoff(
  client: OpencodeClient,
  sessionId: string,
  goal: string
): Promise<string> {
  if (!client) {
    throw new Error("Handoff: client is undefined")
  }
  if (!client.session) {
    const availableProps = Object.keys(client).join(", ")
    throw new Error(
      `Handoff: client.session is undefined. Available properties: ${availableProps}`
    )
  }

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
  return `You are generating a handoff prompt to start a new focused coding session.
Your output will be used DIRECTLY as the initial prompt in a fresh context window with NO prior conversation history.

CRITICAL OUTPUT RULES:
- Output ONLY the raw handoff content
- NO preamble ("Here's the handoff:", "Based on our conversation:", etc.)
- NO markdown code blocks or quotes wrapping the output
- NO meta-commentary or explanations
- Start directly with the @filepath references

STRUCTURE (follow exactly):

1. FILE REFERENCES (first, required)
   @path/to/file1.ts
   @path/to/file2.ts
   [one file per line, ALL files needed]

2. GOAL STATEMENT
   The goal is to [specific, actionable goal].

3. CONTEXT (adapt based on goal type)
   
   For implementation/execution goals:
   - Phase/section name and time estimate if known
   - Numbered task list (high-level)
   - Specific steps with exact file paths, function names, signatures
   - Code to reuse: "Reuse functionName from @path/file.ts"
   
   For planning/design goals:
   - Key findings that inform the design
   - Constraints that must be respected
   - Decisions that need to be made
   
   For research/investigation goals:
   - Current understanding (facts only)
   - Dead ends to NOT repeat
   - Specific questions to answer
   
   For general continuation:
   - Brief current state
   - Clear next action

4. CONSTRAINTS/WARNINGS (if any)
   - Critical constraints
   - Known blockers or issues

PRINCIPLES:
- Files first - they load into context before the text
- Be concrete: exact paths, function names, types, signatures
- No journey recap - only conclusions and actionable next steps
- Dense information - like notes from a senior engineer
- The new session should be able to start work immediately

EXAMPLE OUTPUT:

@src/auth/oauth-provider.ts
@src/auth/token-service.ts
@src/types/auth.ts
@src/middleware/auth-middleware.ts

The goal is to execute Phase 2 of the OAuth Implementation Plan.

Phase 2: Token Management (Estimated: 4-6 hours)

Tasks:
1. Implement token refresh logic
2. Add token revocation endpoint  
3. Update middleware to handle refresh flow

Specific steps:
1. Create refreshToken function in @src/auth/token-service.ts that takes RefreshTokenRequest and returns TokenPair.
2. Reuse validateToken from @src/auth/oauth-provider.ts for token validation.
3. Add POST /auth/refresh endpoint in @src/routes/auth.ts using the new refreshToken function.
4. Update authMiddleware in @src/middleware/auth-middleware.ts to catch expired tokens and attempt refresh.
5. Add token revocation by implementing revokeToken(tokenId: string): Promise<void> in token-service.ts.

Constraints:
- Must maintain backward compatibility with existing JWT flow
- Refresh tokens expire in 7 days (from Phase 1 decision)`
}

function buildUserPrompt(goal: string): string {
  return `Generate a handoff prompt for a new session.

USER'S GOAL: "${goal}"

Analyze our conversation above and create a handoff that:
1. Lists all relevant files with @filepath syntax at the top
2. States the goal clearly  
3. Provides actionable context appropriate for this goal
4. Includes concrete details (file paths, function names, types)

Start directly with the @filepath references. No preamble.`
}
