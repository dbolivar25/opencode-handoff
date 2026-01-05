export interface HandoffOptions {
  goal: string
}

export interface HandoffResult {
  newSessionId: string
  prompt: string
  files: string[]
  switched: boolean
}
