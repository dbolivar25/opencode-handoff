export type HandoffType = "research" | "planning" | "impl" | "general"

export interface HandoffOptions {
  goal: string
  type?: HandoffType
}

export interface HandoffResult {
  newSessionId: string
  type: HandoffType
  prompt: string
  files: string[]
  switched: boolean
}
