import type { OpencodeClient } from "@opencode-ai/sdk"
import type { HandoffOptions, HandoffResult } from "./types.ts"
import { analyzeSessionForHandoff } from "./analyzer.ts"

interface PendingHandoff {
  sessionId: string
  prompt: string
  expires: number
}

const pendingHandoffs = new Map<string, PendingHandoff>()

export async function executeHandoff(
  client: OpencodeClient,
  currentSessionId: string,
  options: HandoffOptions
): Promise<HandoffResult> {
  const { goal } = options

  const prompt = await analyzeSessionForHandoff(client, currentSessionId, goal)

  const title = generateSessionTitle(goal)

  const newSessionResponse = await client.session.create({
    body: {
      parentID: currentSessionId,
      title,
    },
  })

  if (!newSessionResponse.data) {
    throw new Error("Failed to create new session")
  }

  const newSession = newSessionResponse.data
  const fileReferences = extractFileReferences(prompt)

  pendingHandoffs.set(newSession.id, {
    sessionId: newSession.id,
    prompt,
    expires: Date.now() + 5 * 60 * 1000,
  })

  cleanupExpiredHandoffs()

  try {
    await client.tui.publish({
      body: {
        type: "tui.command.execute",
        properties: {
          command: "session.list",
        },
      },
    })
  } catch (_) {
    void _
  }

  await sleep(100)

  try {
    await client.tui.showToast({
      body: {
        title: "Handoff Ready",
        message: `Select "${title}" to continue`,
        variant: "success",
        duration: 5000,
      },
    })
  } catch (_) {
    void _
  }

  return {
    newSessionId: newSession.id,
    prompt,
    files: fileReferences,
    switched: false,
  }
}

export function getPendingHandoff(sessionId: string): PendingHandoff | undefined {
  const handoff = pendingHandoffs.get(sessionId)
  if (handoff && handoff.expires > Date.now()) {
    return handoff
  }
  pendingHandoffs.delete(sessionId)
  return undefined
}

export function clearPendingHandoff(sessionId: string): void {
  pendingHandoffs.delete(sessionId)
}

function cleanupExpiredHandoffs(): void {
  const now = Date.now()
  for (const [id, handoff] of pendingHandoffs) {
    if (handoff.expires < now) {
      pendingHandoffs.delete(id)
    }
  }
}

function generateSessionTitle(goal: string): string {
  const maxLength = 50

  let title = goal.trim()
  title = title.replace(/^(now\s+|please\s+|can you\s+)/i, "")

  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 3) + "..."
  }

  return title.charAt(0).toUpperCase() + title.slice(1)
}

function extractFileReferences(prompt: string): string[] {
  const matches = prompt.match(/@[\w/.@-]+/g) || []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
