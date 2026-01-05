import type { Plugin } from "@opencode-ai/plugin"
import { executeHandoff, getPendingHandoff, clearPendingHandoff } from "./handoff.ts"

export type { HandoffOptions, HandoffResult } from "./types.ts"
export { executeHandoff } from "./handoff.ts"
export { analyzeSessionForHandoff } from "./analyzer.ts"

export const HandoffPlugin: Plugin = async ({ client }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "command.executed" && event.properties.name === "handoff") {
        const goal = event.properties.arguments?.trim()

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

          await executeHandoff(client, event.properties.sessionID, { goal })
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
        return
      }

      if (event.type === "session.updated") {
        const sessionId = event.properties.info.id
        const pendingHandoff = getPendingHandoff(sessionId)

        if (pendingHandoff) {
          clearPendingHandoff(sessionId)

          try {
            await new Promise((resolve) => setTimeout(resolve, 200))

            await client.tui.appendPrompt({
              body: { text: pendingHandoff.prompt },
            })

            await client.tui.showToast({
              body: {
                message: "Handoff prompt ready - review and press Enter",
                variant: "success",
                duration: 3000,
              },
            })
          } catch (_) {
            void _
          }
        }
      }
    },
  }
}

export default HandoffPlugin
