import type { Plugin } from "@opencode-ai/plugin"
import { executeHandoff, getPendingHandoff, clearPendingHandoff } from "./handoff.ts"

export const HandoffPlugin: Plugin = async ({ client }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "command.executed" && event.properties.name === "handoff") {
        await handleHandoffCommand(client, event.properties)
        return
      }

      if (event.type === "tui.session.select") {
        await handleSessionActivation(client, event.properties.sessionID)
        return
      }

      if (event.type === "session.idle") {
        await handleSessionActivation(client, event.properties.sessionID)
        return
      }
    },
  }
}

async function handleHandoffCommand(
  client: Parameters<Plugin>[0]["client"],
  properties: { sessionID: string; arguments?: string }
): Promise<void> {
  const goal = properties.arguments?.trim()

  if (!goal) {
    await client.tui.showToast({
      body: {
        title: "Handoff Error",
        message: "Please provide a goal: /handoff <your goal for the new session>",
        variant: "error",
        duration: 5000,
      },
    })
    return
  }

  try {
    await client.tui.showToast({
      body: {
        message: "Analyzing session for handoff...",
        variant: "info",
        duration: 2000,
      },
    })

    await executeHandoff(client, properties.sessionID, { goal })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    await client.tui.showToast({
      body: {
        title: "Handoff Failed",
        message,
        variant: "error",
        duration: 5000,
      },
    })
  }
}

async function handleSessionActivation(
  client: Parameters<Plugin>[0]["client"],
  sessionId: string
): Promise<void> {
  const pendingHandoff = getPendingHandoff(sessionId)

  if (!pendingHandoff) {
    return
  }

  clearPendingHandoff(sessionId)

  try {
    await sleep(150)

    await client.tui.appendPrompt({
      body: { text: pendingHandoff.prompt },
    })

    await client.tui.showToast({
      body: {
        message: "Handoff ready - review and press Enter to start",
        variant: "success",
        duration: 4000,
      },
    })
  } catch (error) {
    await client.tui.showToast({
      body: {
        title: "Handoff Error",
        message: "Could not fill prompt. Copy from previous session.",
        variant: "warning",
        duration: 5000,
      },
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default HandoffPlugin
